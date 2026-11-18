const router = require('express').Router();
const { Sale } = require('../models');
const { wrap, admin, HttpError } = require('../middleware');
const { move, undo, nextNo } = require('../stock');
const { round2, escapeRx, dateRange } = require('../util');

router.get('/', wrap(async (req, res) => {
  const f = {};
  const dr = dateRange(req.query);
  if (dr) f.date = dr;
  if (req.query.status) f.status = req.query.status;
  if (req.query.q) { const rx = new RegExp(escapeRx(req.query.q), 'i'); f.$or = [{ invoiceNo: rx }, { 'customer.name': rx }, { 'customer.phone': rx }]; }
  res.json(await Sale.find(f).sort('-date -createdAt').limit(500).lean());
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const lines = Array.isArray(b.items) ? b.items : [];
  if (!lines.length) throw new HttpError(400, 'Add at least one item to the invoice.');
  const c = b.customer || {};
  const invoiceNo = await nextNo('sale', 'INV-');
  const done = [], items = [];
  try {
    for (const l of lines) {
      const qty = Number(l.quantity);
      if (!Number.isInteger(qty) || qty <= 0) throw new HttpError(400, 'Each line needs a whole quantity.');
      const m = await move({ productId: l.productId, variantId: l.variantId || undefined, type: 'SALE', quantity: qty,
        reference: invoiceNo, note: `Sold to ${c.name || 'Walk-in Customer'}`, user: req.user.name });
      done.push(m);
      const price = l.price !== undefined && l.price !== '' && Number(l.price) >= 0 ? Number(l.price) : m.info.price;
      items.push({ product: m.productId, variantId: m.variantId || undefined, sku: m.info.sku,
        name: m.info.name + (m.info.label ? ` (${m.info.label})` : ''), quantity: qty, price, cost: m.info.cost, total: round2(qty * price) });
    }
    const subtotal = round2(items.reduce((a, i) => a + i.total, 0));
    const discount = Math.min(Math.max(Number(b.discount) || 0, 0), subtotal);
    const taxRate = Math.min(Math.max(Number(b.taxRate) || 0, 0), 100);
    const tax = round2((subtotal - discount) * taxRate / 100);
    const sale = await Sale.create({
      invoiceNo, items, subtotal, discount, taxRate, tax, total: round2(subtotal - discount + tax),
      customer: { name: String(c.name || '').trim() || 'Walk-in Customer', phone: c.phone || '', address: c.address || '', gstin: c.gstin || '' },
      paymentMode: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'].includes(b.paymentMode) ? b.paymentMode : 'Cash',
      date: b.date ? new Date(b.date) : new Date(), user: req.user.name
    });
    res.status(201).json(sale);
  } catch (e) { await undo(done); throw e; }
}));

router.patch('/:id/cancel', admin, wrap(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new HttpError(404, 'Invoice not found.');
  if (sale.status === 'Cancelled') throw new HttpError(409, 'This invoice is already cancelled.');
  for (const i of sale.items) {
    try {
      await move({ productId: i.product, variantId: i.variantId, type: 'RETURN_IN', quantity: i.quantity,
        reference: sale.invoiceNo, note: 'Invoice cancelled', user: req.user.name });
    } catch (e) { if (e.status !== 404) throw e; } // product since deleted: nothing to restore
  }
  sale.status = 'Cancelled';
  await sale.save();
  res.json(sale);
}));

module.exports = router;
