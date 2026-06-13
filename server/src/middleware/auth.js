const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAgent(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'agent' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Agent access required' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { authenticate, requireAgent, requireAdmin };
