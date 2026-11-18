const bcrypt = require('bcryptjs');
const { User, Brand, Category, Product, Supplier, Setting } = require('./models');
const { logOpening } = require('./stock');

async function seedBase() {
  if (!(await User.countDocuments())) {
    const email = (process.env.ADMIN_EMAIL || 'admin@skaccessories.local').toLowerCase();
    const pw = process.env.ADMIN_PASSWORD || 'Admin@12345';
    await User.create({ name: 'Administrator', email, password: await bcrypt.hash(pw, 12), role: 'admin' });
    console.log(`Created first administrator: ${email}  (change the password after signing in)`);
  }
  if (!(await Brand.countDocuments())) await Brand.insertMany([{ name: 'Sleek' }, { name: 'Ebco' }]);
  if (!(await Category.countDocuments())) await Category.insertMany([
    { name: 'Kitchen Accessories', subcategories: ['Tandem Boxes', 'Pull-out Baskets', 'Corner Units', 'Cutlery Trays'] },
    { name: 'Wardrobe Fittings', subcategories: ['Trouser Racks', 'Tie & Belt Racks', 'Wardrobe Lifts', 'Shoe Racks'] },
    { name: 'Kitchen Hardware', subcategories: ['Hinges', 'Drawer Channels', 'Handles'] },
    { name: 'Furniture Hardware', subcategories: ['Locks', 'Connectors', 'Castors', 'Legs'] }
  ]);
  await Setting.updateOne({ key: 'business' }, { $setOnInsert: { key: 'business' } }, { upsert: true });
}

// Sample data so a fresh install is not empty. Product names/SKUs are placeholders, not a real catalogue.
async function seedDemo() {
  if (await Product.countDocuments()) return console.log('Products already exist - demo data skipped.');
  const brands = Object.fromEntries((await Brand.find()).map(b => [b.name, b._id]));
  const cats = Object.fromEntries((await Category.find()).map(c => [c.name, c._id]));
  const V = (s, size, finish, conf, cost, price, quantity, minStock) => ({ sku: s, size, finish, configuration: conf, purchasePrice: cost, sellingPrice: price, quantity, minStock });
  const rows = [
    ['Soft-Close Tandem Box', 'Sleek', 'Kitchen Accessories', 'Tandem Boxes', 'DEMO-TB', 'Steel', 'Grey', 1450, 2100, 0, 0, [V('DEMO-TB-450', '450 mm', 'Grey', 'Standard', 1450, 2100, 24, 8), V('DEMO-TB-500', '500 mm', 'Grey', 'Standard', 1550, 2250, 6, 8), V('DEMO-TB-550', '550 mm', 'Grey', 'Standard', 1650, 2400, 0, 6)]],
    ['Pull-out Cutlery Tray', 'Sleek', 'Kitchen Accessories', 'Cutlery Trays', 'DEMO-CT', 'Stainless Steel', 'Satin', 1900, 2800, 0, 0, [V('DEMO-CT-600', '600 mm', 'Satin', '', 1900, 2800, 14, 5), V('DEMO-CT-800', '800 mm', 'Satin', '', 2300, 3300, 9, 5)]],
    ['Corner Magic Unit', 'Sleek', 'Kitchen Accessories', 'Corner Units', 'DEMO-CM', 'Steel & Plastic', 'Chrome', 9800, 13500, 4, 5, []],
    ['Pull-out Trouser Rack', 'Ebco', 'Wardrobe Fittings', 'Trouser Racks', 'DEMO-TR', 'Steel', '', 780, 1250, 0, 0, [V('DEMO-TR-CH', '', 'Chrome', '', 780, 1250, 30, 10), V('DEMO-TR-BK', '', 'Matt Black', '', 820, 1320, 12, 10)]],
    ['Wardrobe Lift', 'Ebco', 'Wardrobe Fittings', 'Wardrobe Lifts', 'DEMO-WL', 'Aluminium', 'Silver', 2600, 3900, 0, 3, []],
    ['Concealed Cabinet Hinge', 'Ebco', 'Kitchen Hardware', 'Hinges', 'DEMO-HG', 'Steel', 'Nickel', 0, 0, 0, 0, [V('DEMO-HG-SC', '', 'Nickel', 'Soft-close', 95, 160, 220, 80), V('DEMO-HG-NR', '', 'Nickel', 'Normal', 55, 95, 340, 100)]],
    ['Telescopic Drawer Channel', 'Ebco', 'Kitchen Hardware', 'Drawer Channels', 'DEMO-DC', 'Steel', 'Zinc', 0, 0, 0, 0, [V('DEMO-DC-300', '300 mm', 'Zinc', '', 120, 190, 80, 30), V('DEMO-DC-350', '350 mm', 'Zinc', '', 135, 210, 64, 30), V('DEMO-DC-400', '400 mm', 'Zinc', '', 150, 230, 18, 30), V('DEMO-DC-450', '450 mm', 'Zinc', '', 165, 255, 52, 30)]],
    ['Furniture Castor Wheel', 'Ebco', 'Furniture Hardware', 'Castors', 'DEMO-CW', 'Nylon', 'Black', 45, 85, 60, 20, []]
  ];
  for (const [name, brand, cat, sub, sku, material, finish, cost, price, qty, min, variants] of rows) {
    const p = await Product.create({ name, brand: brands[brand], category: cats[cat], subcategory: sub, sku, material, finish,
      purchasePrice: cost, sellingPrice: price, minStock: min, variants, quantity: variants.length ? variants.reduce((a, v) => a + v.quantity, 0) : qty });
    await logOpening(p, 'Demo data');
  }
  await Supplier.insertMany([{ name: 'Demo Supplier One', contactPerson: 'Sales Desk', phone: '9000000001' }, { name: 'Demo Supplier Two', contactPerson: 'Accounts', phone: '9000000002' }]);
  console.log('Demo products and suppliers added.');
}

module.exports = { seedBase, seedDemo };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockify')
    .then(async () => { await seedBase(); if (process.argv.includes('--demo')) await seedDemo(); })
    .catch(e => { console.error(e.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
