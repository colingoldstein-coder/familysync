const jwt = require('jsonwebtoken');
const db = require('../db');
const { COOKIE_NAME } = require('../cookie');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

async function authenticate(req, res, next) {
  // Read token from httpOnly cookie first, fall back to Authorization header
  let token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    // Verify token version and active status, and get authoritative familyId from DB
    const user = await db('users').where({ id: decoded.id }).select('token_version', 'is_active', 'family_id', 'role', 'is_admin', 'is_super_admin').first();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (decoded.tv !== undefined && user.token_version !== decoded.tv) {
      return res.status(401).json({ error: 'Token expired — please log in again' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    // Use DB-verified familyId, role, and admin status — never trust JWT claims for these
    req.user = {
      ...decoded,
      familyId: user.family_id,
      role: user.role,
      isAdmin: !!user.is_admin,
      isSuperAdmin: !!user.is_super_admin,
    };
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
