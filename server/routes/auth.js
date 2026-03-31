const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { getJwtSecret, authenticate, requireAdmin } = require('../middleware/auth');
const { sendInviteEmail } = require('../email');
const { validate, schemas } = require('../validation');

const router = express.Router();

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
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

function toBool(val) {
  return val === true || val === 1 || val === '1' || val === 't' || val === 'true';
}

function makeToken(user, familyId) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, isAdmin: toBool(user.is_admin), isSuperAdmin: toBool(user.is_super_admin), familyId },
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
      return res.status(400).json({ error: 'Email already registered' });
    }

    const joinCode = generateJoinCode();
    const passwordHash = bcrypt.hashSync(password, 10);

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

    res.json({
      token,
      user: { id: result.userId, name, email, role: 'parent', isAdmin: true, familyId: result.familyId },
    });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send invitation (admin only)
router.post('/invite', authenticate, requireAdmin, validate(schemas.invite), async (req, res) => {
  try {
    const { email, role } = req.body;

    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered' });
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
      console.error('Email send error:', emailErr);
    }

    res.json({ message: 'Invitation sent', inviteToken });
  } catch (err) {
    console.error('Route error:', err);
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
    console.error('Route error:', err);
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

    const existingUser = await db('users').where({ email: invite.email }).first();
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

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

    res.json({
      token: jwtToken,
      user: { id: result.userId, name, email: invite.email, role: invite.role, isAdmin: false, familyId: invite.family_id },
    });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend invitation email (admin only)
router.post('/invitations/:id/resend', authenticate, requireAdmin, async (req, res) => {
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
      console.error('Email send error:', emailErr);
    }

    res.json({ message: `Invitation resent to ${invite.email}` });
  } catch (err) {
    console.error('Route error:', err);
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
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = makeToken(user, user.family_id);

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        isAdmin: toBool(user.is_admin),
        isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
      },
    });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'name', 'email', 'role', 'is_admin', 'is_super_admin', 'family_id', 'avatar_color')
      .first();
    const family = await db('families').where({ id: user.family_id }).first();
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarColor: user.avatar_color,
        isAdmin: toBool(user.is_admin),
        isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
      },
      family,
    });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get family members
router.get('/family-members', authenticate, async (req, res) => {
  try {
    const members = await db('users')
      .where({ family_id: req.user.familyId })
      .select('id', 'name', 'email', 'role', 'is_admin', 'avatar_color');
    res.json({ members });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a family member (admin only, cannot remove yourself)
router.delete('/family-members/:id', authenticate, requireAdmin, async (req, res) => {
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

    await db.transaction(async (trx) => {
      await trx('help_requests').where({ requested_by: memberId }).orWhere({ accepted_by: memberId }).del();
      await trx('tasks').where({ assigned_to: memberId }).orWhere({ assigned_by: memberId }).del();
      await trx('invitations').where({ invited_by: memberId }).del();
      await trx('users').where({ id: memberId }).del();
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.patch('/me/password', authenticate, validate(schemas.updatePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await db('users').where({ id: req.user.id }).first();
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await db('users').where({ id: req.user.id }).update({ password_hash: passwordHash });

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update email
router.patch('/me/email', authenticate, validate(schemas.updateEmail), async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    const user = await db('users').where({ id: req.user.id }).first();
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

    res.json({ message: 'Email updated', token, email: newEmail });
  } catch (err) {
    console.error('Route error:', err);
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

    res.json({ message: 'Name updated', token, name });
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
