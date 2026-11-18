const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { wrap, auth, admin, HttpError } = require('../middleware');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' } });
const safe = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const strong = p => typeof p === 'string' && p.length >= 8;

router.post('/login', limiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email });
  const ok = user && await bcrypt.compare(String(req.body.password || ''), user.password);
  if (!ok) throw new HttpError(401, 'Incorrect email or password.');
  const token = jwt.sign({ id: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: safe(user) });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) throw new HttpError(401, 'Account no longer exists.');
  res.json(safe(u));
}));

router.post('/password', auth, wrap(async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u || !(await bcrypt.compare(String(req.body.current || ''), u.password))) throw new HttpError(400, 'Current password is incorrect.');
  if (!strong(req.body.next)) throw new HttpError(400, 'New password must be at least 8 characters.');
  u.password = await bcrypt.hash(req.body.next, 12);
  await u.save();
  res.json({ ok: true });
}));

router.get('/users', auth, admin, wrap(async (req, res) => {
  res.json((await User.find().sort('name').lean()).map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
}));

router.post('/users', auth, admin, wrap(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email) throw new HttpError(400, 'Name and email are required.');
  if (!strong(password)) throw new HttpError(400, 'Password must be at least 8 characters.');
  const u = await User.create({ name, email, role: role === 'admin' ? 'admin' : 'staff', password: await bcrypt.hash(password, 12) });
  res.status(201).json(safe(u));
}));

router.delete('/users/:id', auth, admin, wrap(async (req, res) => {
  if (req.params.id === String(req.user.id)) throw new HttpError(400, 'You cannot remove your own account.');
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
