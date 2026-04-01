const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../validation');
const logger = require('../logger');

const router = express.Router();

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(404).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: key });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, validate(schemas.pushSubscribe), async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    await db('push_subscriptions')
      .insert({
        user_id: req.user.id,
        endpoint,
        keys_p256dh: keys.p256dh,
        keys_auth: keys.auth,
      })
      .onConflict(['user_id', 'endpoint'])
      .merge();

    res.json({ message: 'Subscribed' });
  } catch (err) {
    logger.error({ msg: 'Push subscribe error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe
router.post('/unsubscribe', authenticate, validate(schemas.pushUnsubscribe), async (req, res) => {
  try {
    const { endpoint } = req.body;

    await db('push_subscriptions')
      .where({ user_id: req.user.id, endpoint })
      .del();

    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    logger.error({ msg: 'Push unsubscribe error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
