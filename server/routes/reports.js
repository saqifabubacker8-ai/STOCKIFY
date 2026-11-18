const router = require('express').Router();
const ExcelJS = require('exceljs');
const { Product, Sale, Purchase } = require('../models');
const { wrap, HttpError } = require('../middleware');
const { flatten, dateRange, round2 } = require('../util');

const STATUS = { ok: 'In stock', low: 'Low stock', out: 'Out of stock' };
const col = (header, key, width = 16, fmt, sum) => ({ header, key, width, fmt, sum });
const stockItems = async () => flatten(await Product.find().populate('brand', 'name').populate('category', 'name').lean());
const inventoryRow = i => ({ sku: i.sku, name: i.name, variant: i.label, brand: i.brand, category: i.category, qty: i.quantity,
  min: i.minStock, cost: i.cost, price: i.price, value: round2(i.quantity * i.cost), status: STATUS[i.status] });
const inventoryCols = [col('SKU', 'sku', 18), col('Product', 'name', 34), col('Variant', 'variant', 24), col('Brand', 'brand', 12), col('Category', 'category', 22),
  col('Qty', 'qty', 9, 'int', true), col('Min', 'min', 9, 'int'), col('Cost', 'cost', 13, 'money'), col('Price', 'price', 13, 'money'),
  col('Stock value', 'value', 16, 'money', true), col('Status', 'status', 14)];

const builders = {
  async inventory() {
    return { title: 'Inventory report', columns: inventoryCols, rows: (await stockItems()).map(inventoryRow) };
  },
  async 'low-stock'() {
    const rows = (await stockItems()).filter(i => i.status !== 'ok').sort((a, b) => a.quantity - b.quantity).map(i => ({ ...inventoryRow(i), short: Math.max(i.minStock - i.quantity, 0) }));
    return { title: 'Low stock report', columns: [...inventoryCols.slice(0, 7), col('Shortfall', 'short', 11, 'int', true), col('Cost', 'cost', 13, 'money'), col('Status', 'status', 14)], rows };
  },
  async 'brand-wise'() {
    const map = {};
    (await stockItems()).forEach(i => {
      const b = map[i.brand || 'Unassigned'] ||= { brand: i.brand || 'Unassigned', products: new Set(), skus: 0, units: 0, cost: 0, retail: 0, low: 0, out: 0 };
      b.products.add(String(i.productId)); b.skus++; b.units += i.quantity; b.cost += i.quantity * i.cost; b.retail += i.quantity * i.price;
      if (i.status === 'low') b.low++; if (i.status === 'out') b.out++;
    });
    return { title: 'Brand-wise stock report',
      columns: [col('Brand', 'brand', 20), col('Products', 'products', 11, 'int', true), col('SKUs', 'skus', 9, 'int', true), col('Units in stock', 'units', 15, 'int', true),
        col('Stock value (cost)', 'cost', 20, 'money', true), col('Stock value (retail)', 'retail', 20, 'money', true), col('Low stock SKUs', 'low', 15, 'int', true), col('Out of stock SKUs', 'out', 17, 'int', true)],
      rows: Object.values(map).map(b => ({ ...b, products: b.products.size, cost: round2(b.cost), retail: round2(b.retail) })) };
  },
  async purchases(q) {
    const f = {}; const dr = dateRange(q); if (dr) f.date = dr;
    const list = await Purchase.find(f).populate('supplier', 'name').sort('-date').lean();
    return { title: 'Purchase report',
      columns: [col('Date', 'date', 14), col('PO no.', 'number', 13), col('Supplier', 'supplier', 26), col('Supplier invoice', 'inv', 18), col('Items', 'items', 9, 'int', true), col('Units', 'units', 9, 'int', true), col('Total', 'total', 16, 'money', true)],
      rows: list.map(p => ({ date: p.date.toISOString().slice(0, 10), number: p.number, supplier: p.supplier && p.supplier.name, inv: p.supplierInvoice,
        items: p.items.length, units: p.items.reduce((a, i) => a + i.quantity, 0), total: p.total })) };
  },
  async sales(q) {
    const f = { status: 'Completed' }; const dr = dateRange(q); if (dr) f.date = dr;
    const list = await Sale.find(f).sort('-date').lean();
    return { title: 'Sales report',
      columns: [col('Date', 'date', 14), col('Invoice', 'invoiceNo', 13), col('Customer', 'customer', 24), col('Units', 'units', 9, 'int', true), col('Subtotal', 'subtotal', 15, 'money', true),
        col('Discount', 'discount', 13, 'money', true), col('Tax', 'tax', 13, 'money', true), col('Total', 'total', 16, 'money', true), col('Gross profit', 'profit', 16, 'money', true), col('Payment', 'paymentMode', 14)],
      rows: list.map(s => ({ date: s.date.toISOString().slice(0, 10), invoiceNo: s.invoiceNo, customer: s.customer && s.customer.name,
        units: s.items.reduce((a, i) => a + i.quantity, 0), subtotal: s.subtotal, discount: s.discount, tax: s.tax, total: s.total,
        profit: round2(s.items.reduce((a, i) => a + (i.price - (i.cost || 0)) * i.quantity, 0) - s.discount), paymentMode: s.paymentMode })) };
  }
};

router.get('/:type', wrap(async (req, res) => {
  const build = builders[req.params.type];
  if (!build) throw new HttpError(404, 'Unknown report.');
  const rep = await build(req.query);
  rep.totals = {};
  rep.columns.filter(c => c.sum).forEach(c => { rep.totals[c.key] = round2(rep.rows.reduce((a, r) => a + (Number(r[c.key]) || 0), 0)); });
  if (req.query.format !== 'xlsx') return res.json(rep);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SK Accessories';
  const ws = wb.addWorksheet(rep.title.slice(0, 31));
  ws.columns = rep.columns.map(c => ({ key: c.key, width: c.width }));
  ws.addRow([`${rep.title} - generated ${new Date().toLocaleString('en-IN')}`]).font = { bold: true, size: 14 };
  ws.addRow([]);
  const head = ws.addRow(rep.columns.map(c => c.header));
  head.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1730' } }; c.alignment = { vertical: 'middle' }; });
  head.height = 22;
  rep.rows.forEach(r => ws.addRow(r));
  rep.columns.forEach((c, i) => {
    const fmt = c.fmt === 'money' ? '"₹"#,##,##0.00' : c.fmt === 'int' ? '#,##0' : null;
    if (fmt) ws.getColumn(i + 1).eachCell((cell, n) => { if (n > 3) cell.numFmt = fmt; });
  });
  if (rep.rows.length && Object.keys(rep.totals).length) {
    const t = ws.addRow({ [rep.columns[0].key]: 'TOTAL', ...rep.totals });
    t.font = { bold: true }; t.eachCell(c => { c.border = { top: { style: 'thin' } }; });
    rep.columns.forEach((c, i) => { if (c.fmt === 'money' && rep.totals[c.key] !== undefined) t.getCell(i + 1).numFmt = '"₹"#,##,##0.00'; });
  }
  ws.views = [{ state: 'frozen', ySplit: 3 }];
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: rep.columns.length } };
  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="sk-accessories-${req.params.type}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(Buffer.from(buf));
}));

module.exports = router;
