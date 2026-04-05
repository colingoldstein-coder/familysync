const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { setAuthCookie, clearAuthCookie } = require('../cookie');
const { sendInviteEmail, generatePasswordResetToken, verifyPasswordResetToken, sendPasswordResetEmail } = require('../email');
const { validate, validateParamId, schemas } = require('../validation');
const audit = require('../audit');
const logger = require('../logger');
const { verifyGoogleToken } = require('../oauth');
const { toBool } = require('../utils');
const { makeToken } = require('../makeToken');

const router = express.Router();

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

// Register a new family (creator becomes admin)
router.post('/register-family', validate(schemas.registerFamily), async (req, res) => {
  try {
    const { familyName, name, email, password } = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Unable to register with this email' });
    }

    const joinCode = generateJoinCode();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (trx) => {
      const familyRef = await nextRefNumber(trx, 'families', 'FS-F-');
      const [family] = await trx('families').insert({ name: familyName, join_code: joinCode, ref_number: familyRef }).returning('id');
      const familyId = family.id || family;
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email, password_hash: passwordHash, role: 'parent', is_admin: true, family_id: familyId, ref_number: userRef,
        profile_setup_complete: false,
      }).returning('id');
      const userId = user.id || user;
      return { familyId, userId };
    });

    const user = { id: result.userId, name, email, role: 'parent', is_admin: true };
    const token = makeToken(user, result.familyId);

    audit.log({ action: 'family.register', actorId: result.userId, targetId: result.familyId, targetType: 'family', ip: req.ip });

    setAuthCookie(res, token);
    res.json({
      user: { id: result.userId, name, email, role: 'parent', isAdmin: true, familyId: result.familyId, profileSetupComplete: false },
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

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (trx) => {
      const userRef = await nextRefNumber(trx, 'users', 'FS-U-');
      const [user] = await trx('users').insert({
        name, email: invite.email, password_hash: passwordHash, role: invite.role, family_id: invite.family_id, ref_number: userRef,
        profile_setup_complete: false,
      }).returning('id');
      const userId = user.id || user;

      await trx('invitations').where({ id: invite.id }).update({ status: 'accepted' });

      return { userId };
    });

    const user = { id: result.userId, name, email: invite.email, role: invite.role, is_admin: false };
    const jwtToken = makeToken(user, invite.family_id);

    setAuthCookie(res, jwtToken);
    res.json({
      user: { id: result.userId, name, email: invite.email, role: invite.role, isAdmin: false, familyId: invite.family_id, profileSetupComplete: false },
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

    const passwordHash = await bcrypt.hash(newPassword, 12);
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

    // Check account lockout — return same error as invalid credentials to prevent enumeration
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!await bcrypt.compare(password, user.password_hash)) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const update = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        // Exponential backoff: 15min, 30min, 1h, 2h, capped at 4h
        const lockMinutes = Math.min(15 * Math.pow(2, Math.floor((attempts - 5) / 2)), 240);
        update.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000);
        audit.log({ action: 'user.locked', actorId: user.id, details: { attempts, lockMinutes }, ip: req.ip });
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
        profile_setup_complete: false,
      }).returning('id');
      const userId = user.id || user;
      return { familyId, userId };
    });

    const user = { id: result.userId, name, email: googleUser.email, role: 'parent', is_admin: true };
    const token = makeToken(user, result.familyId);

    setAuthCookie(res, token);
    res.json({
      user: { id: result.userId, name, email: googleUser.email, role: 'parent', isAdmin: true, familyId: result.familyId, profileSetupComplete: false },
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
        profile_setup_complete: false,
      }).returning('id');
      const userId = user.id || user;
      await trx('invitations').where({ id: invite.id }).update({ status: 'accepted' });
      return { userId };
    });

    const user = { id: result.userId, name, email: invite.email, role: invite.role, is_admin: false };
    const jwtToken = makeToken(user, invite.family_id);

    setAuthCookie(res, jwtToken);
    res.json({
      user: { id: result.userId, name, email: invite.email, role: invite.role, isAdmin: false, familyId: invite.family_id, profileSetupComplete: false },
    });
  } catch (err) {
    logger.error({ msg: 'Google accept-invite error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
