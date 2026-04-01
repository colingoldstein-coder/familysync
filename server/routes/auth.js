const express = require('express');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('../db');
const { getJwtSecret, authenticate, requireAdmin } = require('../middleware/auth');
const { setAuthCookie, clearAuthCookie } = require('../cookie');
const { sendInviteEmail, generatePasswordResetToken, verifyPasswordResetToken, sendPasswordResetEmail } = require('../email');
const { validate, validateParamId, schemas } = require('../validation');
const audit = require('../audit');
const logger = require('../logger');
const { verifyGoogleToken } = require('../oauth');
const { toBool } = require('../utils');

const router = express.Router();

// Avatar upload setup (memory storage — saved as base64 in DB)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

async function nextRefNumber(trx, table, prefix) {
  const [last] = await trx(table)
    .whereNotNull('ref_number')
    .orderBy('id', 'desc')
    .limit(1)
    .select('ref_number');
  let next = 1;
  if (last && last.ref_number) {
    const num = parseInt(last.ref_number.split('-')[2], 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

function makeToken(user, familyId) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, isAdmin: toBool(user.is_admin), isSuperAdmin: toBool(user.is_super_admin), familyId, tv: user.token_version || 0 },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

// Register a new family (creator becomes admin)
router.post('/register-family', validate(schemas.registerFamily), async (req, res) => {
  try {
    const { familyName, name, email, password } = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const joinCode = generateJoinCode();
    const passwordHash = bcrypt.hashSync(password, 12);

    const result = await db.transaction(async (trx) => {
      const familyRef = await nextRefNumber(trx, 'families', 'FS-F-');
      const [family] = await trx('families').insert({ name: familyName, join_code: joinCode, ref_number: familyRef }).returning('id');
      const familyId = family.id || family;
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email, password_hash: passwordHash, role: 'parent', is_admin: true, family_id: familyId, ref_number: userRef,
      }).returning('id');
      const userId = user.id || user;
      return { familyId, userId };
    });

    const user = { id: result.userId, name, email, role: 'parent', is_admin: true };
    const token = makeToken(user, result.familyId);

    audit.log({ action: 'family.register', actorId: result.userId, targetId: result.familyId, targetType: 'family', ip: req.ip });

    setAuthCookie(res, token);
    res.json({
      user: { id: result.userId, name, email, role: 'parent', isAdmin: true, familyId: result.familyId },
    });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Send invitation (admin only)
router.post('/invite', authenticate, requireAdmin, validate(schemas.invite), async (req, res) => {
  try {
    const { email, role } = req.body;

    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const existingInvite = await db('invitations')
      .where({ email, family_id: req.user.familyId, status: 'pending' }).first();
    if (existingInvite) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');

    await db('invitations').insert({
      family_id: req.user.familyId, email, role, token: inviteToken, invited_by: req.user.id,
    });

    const family = await db('families').where({ id: req.user.familyId }).first();

    try {
      await sendInviteEmail({
        to: email,
        familyName: family.name,
        role,
        token: inviteToken,
        inviterName: req.user.name,
      });
    } catch (emailErr) {
      logger.error({ msg: 'Email send error', error: emailErr.message });
    }

    res.json({ message: 'Invitation sent' });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get invitation details by token (public — used by signup page)
router.get('/invite/:token', async (req, res) => {
  try {
    const invite = await db('invitations as i')
      .join('families as f', 'f.id', 'i.family_id')
      .where('i.token', req.params.token)
      .select('i.*', 'f.name as family_name')
      .first();

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been used' });
    }

    res.json({
      email: invite.email,
      role: invite.role,
      familyName: invite.family_name,
    });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept invitation and create account
router.post('/accept-invite', validate(schemas.acceptInvite), async (req, res) => {
  try {
    const { token, name, password } = req.body;

    const invite = await db('invitations').where({ token, status: 'pending' }).first();
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    // Expire invitations older than 30 days
    const inviteAge = Date.now() - new Date(invite.created_at).getTime();
    if (inviteAge > 30 * 24 * 60 * 60 * 1000) {
      await db('invitations').where({ id: invite.id }).update({ status: 'expired' });
      return res.status(400).json({ error: 'This invitation has expired. Please ask your family admin to send a new one.' });
    }

    const existingUser = await db('users').where({ email: invite.email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);

    const result = await db.transaction(async (trx) => {
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email: invite.email, password_hash: passwordHash, role: invite.role, family_id: invite.family_id, ref_number: userRef,
      }).returning('id');
      const userId = user.id || user;

      await trx('invitations').where({ id: invite.id }).update({ status: 'accepted' });

      return { userId };
    });

    const user = { id: result.userId, name, email: invite.email, role: invite.role, is_admin: false };
    const jwtToken = makeToken(user, invite.family_id);

    setAuthCookie(res, jwtToken);
    res.json({
      user: { id: result.userId, name, email: invite.email, role: invite.role, isAdmin: false, familyId: invite.family_id },
    });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend invitation email (admin only)
router.post('/invitations/:id/resend', authenticate, requireAdmin, validateParamId, async (req, res) => {
  try {
    const invite = await db('invitations')
      .where({ id: req.params.id, family_id: req.user.familyId, status: 'pending' }).first();

    if (!invite) {
      return res.status(404).json({ error: 'Pending invitation not found' });
    }

    const family = await db('families').where({ id: req.user.familyId }).first();

    try {
      await sendInviteEmail({
        to: invite.email,
        familyName: family.name,
        role: invite.role,
        token: invite.token,
        inviterName: req.user.name,
      });
    } catch (emailErr) {
      logger.error({ msg: 'Email send error', error: emailErr.message });
    }

    res.json({ message: `Invitation resent to ${invite.email}` });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending invitations for this family (admin only)
router.get('/invitations', authenticate, requireAdmin, async (req, res) => {
  try {
    const invitations = await db('invitations')
      .where({ family_id: req.user.familyId })
      .select('id', 'email', 'role', 'status', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ invitations });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password — sends reset email
router.post('/forgot-password', validate(schemas.forgotPassword), async (req, res) => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    const user = await db('users').where({ email }).first();
    if (user && user.password_hash && user.is_active !== false) {
      const token = await generatePasswordResetToken(user.id);
      try {
        await sendPasswordResetEmail({ to: email, token });
      } catch (err) {
        logger.error({ msg: 'Password reset email error', error: err.message });
      }
    }

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    logger.error({ msg: 'Forgot password error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password — validates token and sets new password
router.post('/reset-password', validate(schemas.resetPassword), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const userId = await verifyPasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user || user.is_active === false) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Password reset is not available.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 12);
    await db('users').where({ id: userId }).update({
      password_hash: passwordHash,
      token_version: db.raw('token_version + 1'),
    });

    audit.log({ action: 'password.reset', actorId: userId, targetId: userId, targetType: 'user', ip: req.ip });

    res.json({ message: 'Password has been reset. You can now log in with your new password.' });
  } catch (err) {
    logger.error({ msg: 'Reset password error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your family admin.' });
    }
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please log in with Google.' });
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Account temporarily locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const update = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        update.locked_until = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 minutes
        audit.log({ action: 'user.locked', actorId: user.id, details: { attempts }, ip: req.ip });
      }
      await db('users').where({ id: user.id }).update(update);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    if (user.failed_login_attempts > 0) {
      await db('users').where({ id: user.id }).update({ failed_login_attempts: 0, locked_until: null });
    }

    const token = makeToken(user, user.family_id);

    audit.log({ action: 'user.login', actorId: user.id, ip: req.ip });

    setAuthCookie(res, token);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        isAdmin: toBool(user.is_admin),
        isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
      },
    });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'name', 'email', 'role', 'is_admin', 'is_super_admin', 'family_id', 'avatar_color', 'avatar_url', 'email_opt_out',
        'notify_pending_requests', 'notify_tasks_due', 'notify_active_events')
      .first();
    const family = await db('families').where({ id: user.family_id }).first();
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        isAdmin: toBool(user.is_admin),
        isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
        emailOptOut: toBool(user.email_opt_out),
        notifyPendingRequests: user.notify_pending_requests !== false,
        notifyTasksDue: user.notify_tasks_due !== false,
        notifyActiveEvents: user.notify_active_events !== false,
      },
      family,
    });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get family members
router.get('/family-members', authenticate, async (req, res) => {
  try {
    const members = await db('users')
      .where({ family_id: req.user.familyId, is_active: true })
      .select('id', 'name', 'email', 'role', 'is_admin', 'avatar_color', 'avatar_url');
    res.json({ members });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a family member (admin only, cannot remove yourself)
router.delete('/family-members/:id', authenticate, requireAdmin, validateParamId, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);

    if (memberId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }

    const member = await db('users')
      .where({ id: memberId, family_id: req.user.familyId }).first();

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent removing the last admin
    if (toBool(member.is_admin)) {
      const [{ count }] = await db('users')
        .where({ family_id: req.user.familyId, is_admin: true, is_active: true })
        .count('id as count');
      if (Number(count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin of the family' });
      }
    }

    if (member.role === 'child') {
      // Soft-delete: deactivate child accounts instead of deleting
      await db('users').where({ id: memberId }).update({ is_active: false });
      audit.log({ action: 'user.deactivate', actorId: req.user.id, targetId: memberId, targetType: 'user', details: { name: member.name, role: member.role }, ip: req.ip });
      res.json({ message: 'Member deactivated' });
    } else {
      // Hard-delete for parent accounts
      await db.transaction(async (trx) => {
        await trx('events').where({ requested_by: memberId }).orWhere({ accepted_by: memberId }).del();
        await trx('help_requests').where({ requested_by: memberId }).orWhere({ accepted_by: memberId }).del();
        await trx('tasks').where({ assigned_to: memberId }).orWhere({ assigned_by: memberId }).del();
        await trx('invitations').where({ invited_by: memberId }).del();
        await trx('push_subscriptions').where({ user_id: memberId }).del();
        await trx('webauthn_credentials').where({ user_id: memberId }).del();
        await trx('users').where({ id: memberId }).del();
      });
      audit.log({ action: 'user.delete', actorId: req.user.id, targetId: memberId, targetType: 'user', details: { name: member.name, role: member.role }, ip: req.ip });
      res.json({ message: 'Member removed' });
    }
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.patch('/me/password', authenticate, validate(schemas.updatePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await db('users').where({ id: req.user.id }).first();
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Cannot change password for Google Sign-In accounts' });
    }
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 12);
    await db('users').where({ id: req.user.id }).update({
      password_hash: passwordHash,
      token_version: db.raw('token_version + 1'),
    });

    // Issue a fresh token so the current session stays valid
    const updated = await db('users').where({ id: req.user.id }).first();
    const token = makeToken(updated, updated.family_id);

    audit.log({ action: 'password.change', actorId: req.user.id, targetId: req.user.id, targetType: 'user', ip: req.ip });

    setAuthCookie(res, token);
    res.json({ message: 'Password updated' });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update email
router.patch('/me/email', authenticate, validate(schemas.updateEmail), async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    const user = await db('users').where({ id: req.user.id }).first();
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Cannot change email for Google Sign-In accounts' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    const existing = await db('users').where({ email: newEmail }).whereNot({ id: req.user.id }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    await db('users').where({ id: req.user.id }).update({ email: newEmail });

    // Issue a new token with the updated email
    const updated = await db('users').where({ id: req.user.id }).first();
    const token = makeToken(updated, updated.family_id);

    setAuthCookie(res, token);
    res.json({ message: 'Email updated', email: newEmail });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update name
router.patch('/me/name', authenticate, validate(schemas.updateName), async (req, res) => {
  try {
    const { name } = req.body;
    await db('users').where({ id: req.user.id }).update({ name });

    const updated = await db('users').where({ id: req.user.id }).first();
    const token = makeToken(updated, updated.family_id);

    setAuthCookie(res, token);
    res.json({ message: 'Name updated', name });
  } catch (err) {
    logger.error({ msg: 'Route error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload avatar (stored as base64 data URL in DB — persists across deploys)
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const mime = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const avatarUrl = `data:${mime};base64,${base64}`;
    await db('users').where({ id: req.user.id }).update({ avatar_url: avatarUrl });
    res.json({ avatarUrl });
  } catch (err) {
    logger.error({ msg: 'Avatar upload error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove avatar
router.delete('/me/avatar', authenticate, async (req, res) => {
  try {
    await db('users').where({ id: req.user.id }).update({ avatar_url: null });
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    logger.error({ msg: 'Avatar remove error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Sign-In: login existing user
router.post('/google-login', validate(schemas.googleLogin), async (req, res) => {
  try {
    const { idToken } = req.body;

    let googleUser;
    try {
      googleUser = await verifyGoogleToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const user = await db('users').where({ email: googleUser.email }).first();
    if (!user) {
      return res.status(404).json({ error: 'no_account' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your family admin.' });
    }

    // Auto-link Google account if not already linked
    if (!user.oauth_provider) {
      await db('users').where({ id: user.id }).update({
        oauth_provider: 'google',
        oauth_provider_id: googleUser.providerId,
      });
    }

    const token = makeToken(user, user.family_id);
    setAuthCookie(res, token);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        isAdmin: toBool(user.is_admin), isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
      },
    });
  } catch (err) {
    logger.error({ msg: 'Google login error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Sign-In: register new family
router.post('/google-register-family', validate(schemas.googleRegisterFamily), async (req, res) => {
  try {
    const { idToken, familyName, name } = req.body;

    let googleUser;
    try {
      googleUser = await verifyGoogleToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const existing = await db('users').where({ email: googleUser.email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const joinCode = generateJoinCode();

    const result = await db.transaction(async (trx) => {
      const familyRef = await nextRefNumber(trx, 'families', 'FS-F-');
      const [family] = await trx('families').insert({ name: familyName, join_code: joinCode, ref_number: familyRef }).returning('id');
      const familyId = family.id || family;
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email: googleUser.email, password_hash: null, role: 'parent',
        is_admin: true, family_id: familyId, ref_number: userRef,
        oauth_provider: 'google', oauth_provider_id: googleUser.providerId,
      }).returning('id');
      const userId = user.id || user;
      return { familyId, userId };
    });

    const user = { id: result.userId, name, email: googleUser.email, role: 'parent', is_admin: true };
    const token = makeToken(user, result.familyId);

    setAuthCookie(res, token);
    res.json({
      user: { id: result.userId, name, email: googleUser.email, role: 'parent', isAdmin: true, familyId: result.familyId },
    });
  } catch (err) {
    logger.error({ msg: 'Google register error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Sign-In: accept invitation
router.post('/google-accept-invite', validate(schemas.googleAcceptInvite), async (req, res) => {
  try {
    const { idToken, inviteToken, name } = req.body;

    let googleUser;
    try {
      googleUser = await verifyGoogleToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const invite = await db('invitations').where({ token: inviteToken, status: 'pending' }).first();
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    // Expire invitations older than 30 days
    const inviteAge = Date.now() - new Date(invite.created_at).getTime();
    if (inviteAge > 30 * 24 * 60 * 60 * 1000) {
      await db('invitations').where({ id: invite.id }).update({ status: 'expired' });
      return res.status(400).json({ error: 'This invitation has expired. Please ask your family admin to send a new one.' });
    }

    if (googleUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(400).json({ error: 'Your Google account email does not match the invitation email' });
    }

    const existingUser = await db('users').where({ email: googleUser.email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const result = await db.transaction(async (trx) => {
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email: invite.email, password_hash: null, role: invite.role,
        family_id: invite.family_id, ref_number: userRef,
        oauth_provider: 'google', oauth_provider_id: googleUser.providerId,
      }).returning('id');
      const userId = user.id || user;
      await trx('invitations').where({ id: invite.id }).update({ status: 'accepted' });
      return { userId };
    });

    const user = { id: result.userId, name, email: invite.email, role: invite.role, is_admin: false };
    const jwtToken = makeToken(user, invite.family_id);

    setAuthCookie(res, jwtToken);
    res.json({
      user: { id: result.userId, name, email: invite.email, role: invite.role, isAdmin: false, familyId: invite.family_id },
    });
  } catch (err) {
    logger.error({ msg: 'Google accept-invite error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Email preferences (authenticated)
router.patch('/me/email-preferences', authenticate, validate(schemas.emailPreferences), async (req, res) => {
  try {
    const { optOut } = req.body;
    await db('users').where({ id: req.user.id }).update({ email_opt_out: optOut });
    res.json({ optedOut: optOut });
  } catch (err) {
    logger.error({ msg: 'Email preferences update error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Notification preferences (which push notification types to receive)
router.patch('/me/notification-preferences', authenticate, validate(schemas.notificationPreferences), async (req, res) => {
  try {
    const { pendingRequests, tasksDue, activeEvents } = req.body;
    const update = {};
    if (pendingRequests !== undefined) update.notify_pending_requests = pendingRequests;
    if (tasksDue !== undefined) update.notify_tasks_due = tasksDue;
    if (activeEvents !== undefined) update.notify_active_events = activeEvents;
    await db('users').where({ id: req.user.id }).update(update);
    res.json({ message: 'Notification preferences updated' });
  } catch (err) {
    logger.error({ msg: 'Notification preferences error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Email preferences (public, token-based)
const { verifyEmailPrefToken } = require('../email');

router.get('/email-preferences/:token', async (req, res) => {
  try {
    const userId = verifyEmailPrefToken(req.params.token);
    if (!userId) return res.status(400).json({ error: 'Invalid or expired link' });

    const user = await db('users').where({ id: userId }).select('name', 'email', 'email_opt_out', 'is_active').first();
    if (!user || user.is_active === false) return res.status(404).json({ error: 'User not found' });

    res.json({ name: user.name, email: user.email, optedOut: !!user.email_opt_out });
  } catch (err) {
    logger.error({ msg: 'Email preferences error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/email-preferences/:token', validate(schemas.emailPreferences), async (req, res) => {
  try {
    const userId = verifyEmailPrefToken(req.params.token);
    if (!userId) return res.status(400).json({ error: 'Invalid or expired link' });

    const user = await db('users').where({ id: userId }).select('is_active').first();
    if (!user || user.is_active === false) return res.status(404).json({ error: 'User not found' });

    const { optOut } = req.body;

    await db('users').where({ id: userId }).update({ email_opt_out: optOut });
    res.json({ optedOut: optOut });
  } catch (err) {
    logger.error({ msg: 'Email preferences error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
