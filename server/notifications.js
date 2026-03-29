const webpush = require('web-push');
const db = require('./db');
const logger = require('./logger');

function isConfigured() {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
}

if (isConfigured()) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@familysync.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushNotification(userId, { title, body, url, tag }) {
  if (!isConfigured()) return;

  const subscriptions = await db('push_subscriptions').where({ user_id: userId });

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
    };

    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({ title, body, url: url || '/', tag: tag || 'default' })
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db('push_subscriptions').where({ id: sub.id }).del();
      } else {
        logger.error({ err, userId, endpoint: sub.endpoint }, 'Push notification failed');
      }
    }
  }
}

async function notifyUser(userId, payload) {
  try {
    await sendPushNotification(userId, payload);
  } catch (err) {
    logger.error({ err }, 'notifyUser failed');
  }
}

async function notifyFamilyMembers(familyId, excludeUserId, payload) {
  if (!isConfigured()) return;

  try {
    const members = await db('users')
      .where({ family_id: familyId })
      .whereNot({ id: excludeUserId })
      .select('id');

    for (const member of members) {
      await sendPushNotification(member.id, payload);
    }
  } catch (err) {
    logger.error({ err }, 'notifyFamilyMembers failed');
  }
}

module.exports = { sendPushNotification, notifyUser, notifyFamilyMembers, isConfigured };
