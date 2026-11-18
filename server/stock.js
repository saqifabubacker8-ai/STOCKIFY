// All stock changes go through here so inventory stays accurate and every change is logged.
const { Product, Transaction, Counter } = require('./models');
const { HttpError } = require('./middleware');
const { emit } = require('./events');

const SIGN = { PURCHASE: 1, STOCK_IN: 1, RETURN_IN: 1, SALE: -1, STOCK_OUT: -1, DAMAGED: -1, RETURN_OUT: -1 };

async function applyDelta(productId, variantId, delta) {
  const filter = { _id: productId };
  const update = { $inc: { quantity: delta } };
  if (variantId) {
    filter.variants = { $elemMatch: { _id: variantId, ...(delta < 0 ? { quantity: { $gte: -delta } } : {}) } };
    update.$inc['variants.$.quantity'] = delta;
  } else if (delta < 0) filter.quantity = { $gte: -delta };
  const p = await Product.findOneAndUpdate(filter, update, { new: true });
  if (!p) throw new HttpError(409, 'Not enough stock for this item.');
  return p;
}

async function move({ productId, variantId, type, quantity, note = '', reference = '', user = '' }) {
  const p0 = await Product.findById(productId);
  if (!p0) throw new HttpError(404, 'Product not found.');
  let v = null;
  if (p0.variants.length) {
    v = p0.variants.id(variantId);
    if (!v) throw new HttpError(400, `Choose a variant for ${p0.name}.`);
  }
  const q = Number(quantity);
  if (!Number.isInteger(q) || q < 0) throw new HttpError(400, 'Quantity must be a whole number.');
  let delta;
  if (type === 'ADJUSTMENT') delta = q - (v ? v.quantity : p0.quantity);
  else {
    if (!SIGN[type]) throw new HttpError(400, 'Unknown stock movement type.');
    if (q <= 0) throw new HttpError(400, 'Quantity must be greater than zero.');
    delta = SIGN[type] * q;
  }
  const label = v ? [v.size, v.finish, v.configuration].filter(Boolean).join(' / ') : '';
  const info = {
    name: p0.name, sku: v ? v.sku : p0.sku, label,
    cost: (v && v.purchasePrice) || p0.purchasePrice || 0,
    price: (v && v.sellingPrice) || p0.sellingPrice || 0
  };
  if (delta === 0) return { delta: 0, txn: null, info, productId: p0._id, variantId: v && v._id };
  const p = await applyDelta(p0._id, v && v._id, delta);
  const balance = v ? p.variants.id(v._id).quantity : p.quantity;
  const txn = await Transaction.create({
    product: p._id, variantId: v && v._id, productName: info.name, sku: info.sku, variantLabel: label,
    type, quantity: Math.abs(delta), delta, balance, reference, note, user
  });
  emit('stock');
  return { delta, txn, info, productId: p._id, variantId: v && v._id, balance };
}

// Roll back moves already applied when a later line of a multi-line document fails
async function undo(moves) {
  for (const m of [...moves].reverse()) {
    if (!m.delta) continue;
    try { await applyDelta(m.productId, m.variantId, -m.delta); await Transaction.deleteOne({ _id: m.txn._id }); }
    catch (e) { console.error('Rollback failed', e.message); }
  }
  emit('stock');
}

async function logOpening(product, user, onlyVariantIds) {
  const rows = [];
  const label = v => [v.size, v.finish, v.configuration].filter(Boolean).join(' / ');
  if (product.variants.length) {
    for (const v of product.variants) {
      if (v.quantity > 0 && (!onlyVariantIds || onlyVariantIds.has(String(v._id))))
        rows.push({ variantId: v._id, sku: v.sku, quantity: v.quantity, variantLabel: label(v) });
    }
  } else if (product.quantity > 0) rows.push({ sku: product.sku, quantity: product.quantity, variantLabel: '' });
  if (rows.length) await Transaction.insertMany(rows.map(r => ({
    ...r, product: product._id, productName: product.name, type: 'OPENING', delta: r.quantity, balance: r.quantity, note: 'Opening stock', user
  })));
}

async function nextNo(key, prefix) {
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return prefix + String(c.seq).padStart(5, '0');
}

module.exports = { move, undo, applyDelta, logOpening, nextNo };
