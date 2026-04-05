const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { setAuthCookie } = require('../cookie');
const { validate, validateParamId, schemas } = require('../validation');
const { verifyEmailPrefToken } = require('../email');
const { validateImageBuffer } = require('../imageValidation');
const { makeToken } = require('../makeToken');
const { toBool } = require('../utils');
const audit = require('../audit');
const logger = require('../logger');

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

// Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'name', 'email', 'role', 'is_admin', 'is_super_admin', 'family_id', 'avatar_color', 'avatar_url', 'email_opt_out',
        'notify_pending_requests', 'notify_tasks_due', 'notify_active_events',
        'notify_new_requests', 'notify_new_events', 'notify_responses',
        'profile_setup_complete', 'profile_reminder_dismissed')
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
        notifyNewRequests: user.notify_new_requests !== false,
        notifyNewEvents: user.notify_new_events !== false,
        notifyResponses: user.notify_responses !== false,
        profileSetupComplete: toBool(user.profile_setup_complete) !== false,
        profileReminderDismissed: toBool(user.profile_reminder_dismissed),
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
      await db('users').where({ id: memberId }).update({ is_active: false });
      audit.log({ action: 'user.deactivate', actorId: req.user.id, targetId: memberId, targetType: 'user', details: { name: member.name, role: member.role }, ip: req.ip });
      res.json({ message: 'Member deactivated' });
    } else {
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
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db('users').where({ id: req.user.id }).update({
      password_hash: passwordHash,
      token_version: db.raw('token_version + 1'),
    });

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
    if (!await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    const existing = await db('users').where({ email: newEmail }).whereNot({ id: req.user.id }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const oldEmail = user.email;
    await db('users').where({ id: req.user.id }).update({ email: newEmail });

    audit.log({ action: 'email.change', actorId: req.user.id, targetId: req.user.id, targetType: 'user', details: { oldEmail, newEmail }, ip: req.ip });

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

// Upload avatar (stored as base64 data URL in DB)
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    if (!validateImageBuffer(req.file.buffer)) {
      return res.status(400).json({ error: 'File is not a valid image' });
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mime = allowedMimes.includes(req.file.mimetype) ? req.file.mimetype : 'image/jpeg';
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

// Mark profile setup as complete
router.patch('/me/profile-setup-complete', authenticate, async (req, res) => {
  try {
    await db('users').where({ id: req.user.id }).update({ profile_setup_complete: true });
    res.json({ message: 'Profile setup marked as complete' });
  } catch (err) {
    logger.error({ msg: 'Profile setup complete error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Dismiss profile setup reminder
router.patch('/me/profile-reminder-dismiss', authenticate, async (req, res) => {
  try {
    await db('users').where({ id: req.user.id }).update({ profile_reminder_dismissed: true });
    res.json({ message: 'Profile reminder dismissed' });
  } catch (err) {
    logger.error({ msg: 'Profile reminder dismiss error', error: err.message });
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
    const { pendingRequests, tasksDue, activeEvents, newRequests, newEvents, responses } = req.body;
    const update = {};
    if (pendingRequests !== undefined) update.notify_pending_requests = pendingRequests;
    if (tasksDue !== undefined) update.notify_tasks_due = tasksDue;
    if (activeEvents !== undefined) update.notify_active_events = activeEvents;
    if (newRequests !== undefined) update.notify_new_requests = newRequests;
    if (newEvents !== undefined) update.notify_new_events = newEvents;
    if (responses !== undefined) update.notify_responses = responses;
    await db('users').where({ id: req.user.id }).update(update);
    res.json({ message: 'Notification preferences updated' });
  } catch (err) {
    logger.error({ msg: 'Notification preferences error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Email preferences (public, token-based)
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
