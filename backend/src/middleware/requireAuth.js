const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  try {
    req.user = jwt.verify(token, process.env.APP_JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

module.exports = { requireAuth };
