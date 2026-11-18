const router = require('express').Router();
const { Purchase, Supplier } = require('../models');
const { wrap, HttpError } = require('../middleware');
const { move, undo, nextNo } = require('../stock');
const { round2, escapeRx, dateRange } = require('../util');

router.get('/', wrap(async (req, res) => {
  const f = {};
  const dr = dateRange(req.query);
  if (dr) f.date = dr;
  if (req.query.supplier) f.supplier = req.query.supplier;
  if (req.query.q) { const rx = new RegExp(escapeRx(req.query.q), 'i'); f.$or = [{ number: rx }, { supplierInvoice: rx }]; }
  res.json(await Purchase.find(f).populate('supplier', 'name phone').sort('-date -createdAt').limit(500).lean());
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const lines = Array.isArray(b.items) ? b.items : [];
  if (!lines.length) throw new HttpError(400, 'Add at least one item.');
  const supplier = await Supplier.findById(b.supplier);
  if (!supplier) throw new HttpError(400, 'Choose a supplier.');
  const number = await nextNo('purchase', 'PO-');
  const done = [], items = [];
  try {
    for (const l of lines) {
      const qty = Number(l.quantity), price = Number(l.price);
      if (!Number.isInteger(qty) || qty <= 0 || !(price >= 0)) throw new HttpError(400, 'Each line needs a whole quantity and a valid price.');
      const m = await move({ productId: l.productId, variantId: l.variantId || undefined, type: 'PURCHASE', quantity: qty,
        reference: number, note: `Purchase from ${supplier.name}`, user: req.user.name });
      done.push(m);
      items.push({ product: m.productId, variantId: m.variantId || undefined, sku: m.info.sku,
        name: m.info.name + (m.info.label ? ` (${m.info.label})` : ''), quantity: qty, price, total: round2(qty * price) });
    }
    const purchase = await Purchase.create({
      number, supplier: supplier._id, supplierInvoice: String(b.supplierInvoice || '').trim(),
      date: b.date ? new Date(b.date) : new Date(), items, total: round2(items.reduce((a, i) => a + i.total, 0)),
      notes: String(b.notes || '').slice(0, 500), user: req.user.name
    });
    res.status(201).json(purchase);
  } catch (e) { await undo(done); throw e; }
}));

module.exports = router;
