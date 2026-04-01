const db = require('./db');
const logger = require('./logger');

/**
 * Log an audit event.
 * @param {object} opts
 * @param {string} opts.action - e.g. 'user.delete', 'password.change', 'admin.send_email'
 * @param {number} [opts.actorId] - user who performed the action
 * @param {number} [opts.targetId] - affected entity id
 * @param {string} [opts.targetType] - e.g. 'user', 'family'
 * @param {object|string} [opts.details] - extra context
 * @param {string} [opts.ip] - request IP
 */
async function log({ action, actorId, targetId, targetType, details, ip }) {
  try {
    await db('audit_logs').insert({
      action,
      actor_id: actorId || null,
      target_id: targetId || null,
      target_type: targetType || null,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      ip_address: ip || null,
    });
  } catch (err) {
    // Never let audit failures break the request
    logger.error({ msg: 'Audit log write failed', error: err.message, action });
  }
}

module.exports = { log };
