const router = require('express').Router();
const { Product } = require('../models');
const { wrap, admin, HttpError } = require('../middleware');
const { escapeRx, productStatus, flatten } = require('../util');
const { logOpening } = require('../stock');
const { emit } = require('../events');

const populate = q => q.populate('brand', 'name').populate('category', 'name subcategories');

function normalize(b) {
  const n = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : d; };
  const s = v => String(v || '').trim();
  const d = {
    name: s(b.name), image: typeof b.image === 'string' ? b.image : '', brand: b.brand, category: b.category,
    subcategory: s(b.subcategory), sku: s(b.sku).toUpperCase(), dimensions: s(b.dimensions), material: s(b.material),
    finish: s(b.finish), description: s(b.description), purchasePrice: n(b.purchasePrice), sellingPrice: n(b.sellingPrice),
    minStock: Math.floor(n(b.minStock)), quantity: Math.floor(n(b.quantity))
  };
  d.variants = (Array.isArray(b.variants) ? b.variants : []).map(v => ({
    _id: v._id || undefined, sku: s(v.sku).toUpperCase(), size: s(v.size), finish: s(v.finish), configuration: s(v.configuration),
    purchasePrice: n(v.purchasePrice, d.purchasePrice), sellingPrice: n(v.sellingPrice, d.sellingPrice),
    quantity: Math.floor(n(v.quantity)), minStock: Math.floor(n(v.minStock, d.minStock))
  }));
  return d;
}

async function checkSkus(d, excludeId) {
  if (!d.name || !d.brand || !d.category || !d.sku) throw new HttpError(400, 'Name, brand, category and SKU are required.');
  const skus = [d.sku, ...d.variants.map(v => v.sku)];
  if (skus.some(x => !x)) throw new HttpError(400, 'Every variant needs its own SKU.');
  if (new Set(skus).size !== skus.length) throw new HttpError(400, 'SKUs must be unique within the product.');
  const q = { $or: [{ sku: { $in: skus } }, { 'variants.sku': { $in: skus } }] };
  if (excludeId) q._id = { $ne: excludeId };
  const dup = await Product.findOne(q).lean();
  if (dup) {
    const used = [dup.sku, ...dup.variants.map(v => v.sku)];
    throw new HttpError(409, `SKU ${skus.find(x => used.includes(x))} is already used by "${dup.name}".`);
  }
}
const sum = vs => vs.reduce((a, v) => a + v.quantity, 0);

router.get('/', wrap(async (req, res) => {
  const { q, brand, category, status } = req.query;
  const f = {};
  if (brand) f.brand = brand;
  if (category) f.category = category;
  if (q) {
    const rx = new RegExp(escapeRx(q), 'i');
    f.$or = [{ name: rx }, { sku: rx }, { 'variants.sku': rx }, { material: rx }, { finish: rx }, { subcategory: rx }];
  }
  let list = await populate(Product.find(f).sort('-createdAt')).lean();
  list.forEach(p => { p.status = productStatus(p); });
  if (status) list = list.filter(p => p.status === status);
  res.json(list);
}));

router.get('/items', wrap(async (req, res) => {
  res.json(flatten(await populate(Product.find()).lean()));
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await populate(Product.findById(req.params.id)).lean();
  if (!p) throw new HttpError(404, 'Product not found.');
  p.status = productStatus(p);
  res.json(p);
}));

router.post('/', admin, wrap(async (req, res) => {
  const d = normalize(req.body);
  await checkSkus(d);
  d.variants.forEach(v => delete v._id);
  if (d.variants.length) d.quantity = sum(d.variants);
  const p = await Product.create(d);
  await logOpening(p, req.user.name);
  emit('stock');
  res.status(201).json(p);
}));

router.put('/:id', admin, wrap(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  const d = normalize(req.body);
  await checkSkus(d, p._id);
  const hadVariants = p.variants.length > 0;
  const oldIds = new Set(p.variants.map(v => String(v._id)));
  const merged = d.variants.map(v => {
    const old = v._id && p.variants.id(v._id);
    if (old) return { ...v, quantity: old.quantity };   // existing stock is only changed through Inventory
    const { _id, ...fresh } = v; return fresh;
  });
  for (const old of p.variants) {
    if (!merged.some(m => String(m._id) === String(old._id)) && old.quantity > 0)
      throw new HttpError(409, `Variant ${old.sku} still has ${old.quantity} in stock. Adjust it to 0 before removing it.`);
  }
  if (!hadVariants && merged.length && p.quantity > 0) throw new HttpError(409, 'Adjust this product\'s stock to 0 before adding variants.');
  const { quantity, variants, ...fields } = d;
  p.set(fields);
  p.variants = merged;
  if (merged.length) p.quantity = sum(merged); else if (hadVariants) p.quantity = 0;
  await p.save();
  await logOpening(p, req.user.name, new Set(p.variants.filter(v => !oldIds.has(String(v._id))).map(v => String(v._id))));
  emit('stock');
  res.json(p);
}));

router.delete('/:id', admin, wrap(async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found.');
  emit('stock');
  res.json({ ok: true });
}));

module.exports = router;
