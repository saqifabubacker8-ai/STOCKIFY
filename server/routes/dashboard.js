const router = require('express').Router();
const { Product, Sale, Purchase, Transaction } = require('../models');
const { wrap } = require('../middleware');
const { flatten } = require('../util');

const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

router.get('/', wrap(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const products = await Product.find().populate('brand', 'name').populate('category', 'name').lean();
  const items = flatten(products);
  const stats = {
    totalProducts: products.length,
    totalSkus: items.length,
    availableStock: items.reduce((a, i) => a + i.quantity, 0),
    lowStock: items.filter(i => i.status === 'low').length,
    outOfStock: items.filter(i => i.status === 'out').length,
    inventoryValue: items.reduce((a, i) => a + i.quantity * i.cost, 0),
    retailValue: items.reduce((a, i) => a + i.quantity * i.price, 0)
  };

  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));
  const [sales, purchases] = await Promise.all([
    Sale.find({ date: { $gte: since }, status: 'Completed' }, 'date total').lean(),
    Purchase.find({ date: { $gte: since } }, 'date total').lean()
  ]);
  const labels = [], idx = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setDate(since.getDate() + i);
    idx[key(d)] = i; labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  }
  const salesSeries = Array(days).fill(0), purchaseSeries = Array(days).fill(0);
  sales.forEach(s => { const i = idx[key(new Date(s.date))]; if (i !== undefined) salesSeries[i] += s.total; });
  purchases.forEach(p => { const i = idx[key(new Date(p.date))]; if (i !== undefined) purchaseSeries[i] += p.total; });
  stats.todaySales = salesSeries[days - 1];

  const brandMap = {};
  items.forEach(i => { const b = i.brand || 'Unassigned'; brandMap[b] = (brandMap[b] || { units: 0, value: 0 }); brandMap[b].units += i.quantity; brandMap[b].value += i.quantity * i.cost; });

  const [recentSales, recentPurchases, activity] = await Promise.all([
    Sale.find().sort('-date -createdAt').limit(6).select('invoiceNo customer.name total date status').lean(),
    Purchase.find().sort('-date -createdAt').limit(6).populate('supplier', 'name').select('number supplier total date').lean(),
    Transaction.find().sort('-createdAt').limit(10).lean()
  ]);

  res.json({
    stats, days,
    trend: { labels, sales: salesSeries, purchases: purchaseSeries },
    brands: Object.entries(brandMap).map(([name, v]) => ({ name, ...v })),
    alerts: items.filter(i => i.status !== 'ok').sort((a, b) => a.quantity - b.quantity).slice(0, 8),
    recentSales, recentPurchases, activity
  });
}));

module.exports = router;
