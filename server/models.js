const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const T = { timestamps: true };
const money = { type: Number, default: 0, min: 0 };
const ref = (to, extra = {}) => ({ type: Schema.Types.ObjectId, ref: to, ...extra });

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
}, T));

const Brand = model('Brand', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true, default: '' }
}, T));

const Category = model('Category', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  subcategories: [{ type: String, trim: true }]
}, T));

const Supplier = model('Supplier', new Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  gstin: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' }
}, T));

const variantSchema = new Schema({
  sku: { type: String, required: true, trim: true, uppercase: true },
  size: { type: String, default: '' },
  finish: { type: String, default: '' },
  configuration: { type: String, default: '' },
  purchasePrice: money,
  sellingPrice: money,
  quantity: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 0, min: 0 }
});

const Product = model('Product', new Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  brand: ref('Brand', { required: true }),
  category: ref('Category', { required: true }),
  subcategory: { type: String, default: '' },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  dimensions: { type: String, default: '' },
  material: { type: String, default: '' },
  finish: { type: String, default: '' },
  description: { type: String, default: '' },
  purchasePrice: money,
  sellingPrice: money,
  quantity: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 0, min: 0 },
  variants: [variantSchema]
}, T));

const Transaction = model('Transaction', new Schema({
  product: ref('Product'),
  variantId: Schema.Types.ObjectId,
  productName: String,
  sku: String,
  variantLabel: { type: String, default: '' },
  type: { type: String, required: true },
  quantity: Number,
  delta: Number,
  balance: Number,
  reference: { type: String, default: '' },
  note: { type: String, default: '' },
  user: { type: String, default: '' }
}, T).index({ createdAt: -1 }));

const lineItem = {
  product: ref('Product'), variantId: Schema.Types.ObjectId,
  sku: String, name: String, quantity: Number, price: Number, total: Number
};

const Purchase = model('Purchase', new Schema({
  number: { type: String, unique: true },
  supplier: ref('Supplier', { required: true }),
  supplierInvoice: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  items: [new Schema(lineItem, { _id: false })],
  total: money,
  notes: { type: String, default: '' },
  user: String
}, T));

const Sale = model('Sale', new Schema({
  invoiceNo: { type: String, unique: true },
  customer: { name: String, phone: String, address: String, gstin: String },
  items: [new Schema({ ...lineItem, cost: money }, { _id: false })],
  subtotal: money, discount: money, taxRate: money, tax: money, total: money,
  paymentMode: { type: String, default: 'Cash' },
  status: { type: String, enum: ['Completed', 'Cancelled'], default: 'Completed' },
  date: { type: Date, default: Date.now },
  user: String
}, T));

const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

const Setting = model('Setting', new Schema({
  key: { type: String, unique: true },
  name: { type: String, default: 'My Hardware Store' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  gstin: { type: String, default: '' },
  invoiceNote: { type: String, default: 'Thank you for your business.' }
}));

module.exports = { User, Brand, Category, Supplier, Product, Transaction, Purchase, Sale, Counter, Setting };
