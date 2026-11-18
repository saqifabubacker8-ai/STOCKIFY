// Brands, categories and suppliers: simple admin-managed lists.
const express = require('express');
const { Brand, Category, Supplier, Product, Purchase } = require('../models');
const { wrap, admin, HttpError } = require('../middleware');
const { pick } = require('../util');

function crud(Model, { fields, inUse, countField }) {
  const r = express.Router();
  r.get('/', wrap(async (req, res) => {
    const list = await Model.find().sort('name').lean();
    if (countField) {
      const rows = await Product.aggregate([{ $group: { _id: '$' + countField, n: { $sum: 1 } } }]);
      const map = Object.fromEntries(rows.map(x => [String(x._id), x.n]));
      list.forEach(i => { i.productCount = map[String(i._id)] || 0; });
    }
    res.json(list);
  }));
  const clean = body => {
    const d = pick(body, fields);
    if (typeof d.subcategories === 'string') d.subcategories = d.subcategories.split(',');
    if (Array.isArray(d.subcategories)) d.subcategories = [...new Set(d.subcategories.map(s => String(s).trim()).filter(Boolean))];
    return d;
  };
  r.post('/', admin, wrap(async (req, res) => res.status(201).json(await Model.create(clean(req.body)))));
  r.put('/:id', admin, wrap(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, clean(req.body), { new: true, runValidators: true });
    if (!doc) throw new HttpError(404, 'Not found.');
    res.json(doc);
  }));
  r.delete('/:id', admin, wrap(async (req, res) => {
    if (inUse) { const n = await inUse(req.params.id); if (n) throw new HttpError(409, `Cannot delete: it is used by ${n} record(s). Reassign or remove those first.`); }
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  }));
  return r;
}

module.exports = {
  brands: crud(Brand, { fields: ['name', 'description'], countField: 'brand', inUse: id => Product.countDocuments({ brand: id }) }),
  categories: crud(Category, { fields: ['name', 'subcategories'], countField: 'category', inUse: id => Product.countDocuments({ category: id }) }),
  suppliers: crud(Supplier, { fields: ['name', 'contactPerson', 'phone', 'email', 'gstin', 'address'], inUse: id => Purchase.countDocuments({ supplier: id }) })
};
