const router = require('express').Router();
const { Transaction } = require('../models');
const { wrap, HttpError } = require('../middleware');
const { move } = require('../stock');
const { escapeRx, dateRange } = require('../util');

const MANUAL = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGED', 'RETURN_IN', 'RETURN_OUT'];

router.post('/move', wrap(async (req, res) => {
  const b = req.body;
  if (!MANUAL.includes(b.type)) throw new HttpError(400, 'Choose a valid movement type.');
  const r = await move({ productId: b.productId, variantId: b.variantId || undefined, type: b.type, quantity: b.quantity,
    note: String(b.note || '').slice(0, 300), reference: String(b.reference || '').slice(0, 60), user: req.user.name });
  res.status(201).json({ delta: r.delta, balance: r.balance });
}));

router.get('/transactions', wrap(async (req, res) => {
  const { type, q, product } = req.query;
  const f = {};
  if (type) f.type = type;
  if (product) f.product = product;
  const dr = dateRange(req.query);
  if (dr) f.createdAt = dr;
  if (q) { const rx = new RegExp(escapeRx(q), 'i'); f.$or = [{ productName: rx }, { sku: rx }, { reference: rx }, { note: rx }]; }
  res.json(await Transaction.find(f).sort('-createdAt').limit(Math.min(Number(req.query.limit) || 200, 1000)).lean());
}));

module.exports = router;
