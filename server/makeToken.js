const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./middleware/auth');
const { toBool } = require('./utils');

function makeToken(user, familyId) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, isAdmin: toBool(user.is_admin), isSuperAdmin: toBool(user.is_super_admin), familyId, tv: user.token_version || 0 },
    getJwtSecret(),
    { expiresIn: '2d' }
  );
}

module.exports = { makeToken };
