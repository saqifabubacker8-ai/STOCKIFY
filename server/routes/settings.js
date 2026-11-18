const router = require('express').Router();
const { Setting } = require('../models');
const { wrap, admin } = require('../middleware');
const { pick } = require('../util');

router.get('/', wrap(async (req, res) => {
  res.json(await Setting.findOneAndUpdate({ key: 'business' }, { $setOnInsert: { key: 'business' } }, { upsert: true, new: true }).lean());
}));
router.put('/', admin, wrap(async (req, res) => {
  res.json(await Setting.findOneAndUpdate({ key: 'business' }, pick(req.body, ['name', 'address', 'phone', 'email', 'gstin', 'invoiceNote']), { upsert: true, new: true }).lean());
}));
module.exports = router;
