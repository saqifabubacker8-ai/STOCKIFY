const jwt = require('jsonwebtoken');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  // EventSource cannot send headers, so only the live-update stream may use a query token
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.path === '/events' ? req.query.token : '');
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Please sign in again.' }); }
};
const admin = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access is required.' });

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500, message = err.message;
  if (err.code === 11000) { status = 409; message = `Already exists: ${Object.values(err.keyValue || {}).join(', ')}`; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(' '); }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid value supplied.'; }
  if (status >= 500) { console.error(err); message = 'Something went wrong on the server.'; }
  res.status(status).json({ message });
};

module.exports = { HttpError, wrap, auth, admin, errorHandler };
