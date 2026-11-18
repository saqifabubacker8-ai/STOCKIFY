require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const { auth, errorHandler } = require('./middleware');
const { stream } = require('./events');
const { seedBase } = require('./seed');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('JWT_SECRET is not set: using a temporary secret, so everyone is signed out on each restart. Set it in .env.');
}
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: {
  'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], 'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'blob:'], 'connect-src': ["'self'"], 'upgrade-insecure-requests': null } } }));
app.use(compression({ filter: (req, res) => (req.path.startsWith('/api/events') ? false : compression.filter(req, res)) }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'stockify' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', auth);
app.get('/api/events', stream);
const { brands, categories, suppliers } = require('./routes/masters');
app.use('/api/settings', require('./routes/settings'));
app.use('/api/brands', brands);
app.use('/api/categories', categories);
app.use('/api/suppliers', suppliers);
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockify')
  .then(async () => { await seedBase(); app.listen(PORT, () => console.log(`STOCKIFY running at http://localhost:${PORT}`)); })
  .catch(e => { console.error('Could not connect to MongoDB:', e.message); process.exit(1); });
