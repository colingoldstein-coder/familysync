const jwt = require('jsonwebtoken');
const db = require('../db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    // Verify token hasn't been invalidated by password change
    if (decoded.tv !== undefined) {
      const user = await db('users').where({ id: decoded.id }).select('token_version').first();
      if (user && user.token_version !== decoded.tv) {
        return res.status(401).json({ error: 'Token expired — please log in again' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireParent(req, res, next) {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parent access required' });
  }
  next();
}

function requireChild(req, res, next) {
  if (req.user.role !== 'child') {
    return res.status(403).json({ error: 'Child access required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = { authenticate, requireParent, requireChild, requireAdmin, requireSuperAdmin, getJwtSecret };
