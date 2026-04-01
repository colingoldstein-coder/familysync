const db = require('./db');
const { sendPushNotification, isConfigured } = require('./notifications');
const logger = require('./logger');

// Runs every 15 minutes, checks for pending items and sends summary push notifications
const CHECK_INTERVAL = 15 * 60 * 1000;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeString() {
  return new Date().toTimeString().slice(0, 5);
}

async function checkAndNotify() {
  if (!isConfigured()) return;

  try {
    // Get all users who have push subscriptions and at least one notification type enabled
    const usersWithSubs = await db('push_subscriptions')
      .join('users', 'users.id', 'push_subscriptions.user_id')
      .where('users.is_active', true)
      .select('users.id', 'users.name', 'users.family_id',
        'users.notify_pending_requests', 'users.notify_tasks_due', 'users.notify_active_events')
      .groupBy('users.id', 'users.name', 'users.family_id',
        'users.notify_pending_requests', 'users.notify_tasks_due', 'users.notify_active_events');

    const today = todayDateString();
    const now = nowTimeString();

    for (const user of usersWithSubs) {
      const parts = [];

      // Check pending requests (assigned to this user, still pending)
      if (user.notify_pending_requests !== false) {
        const pendingRequests = await db('help_requests')
          .where({ requested_to: user.id, status: 'pending' })
          .orWhere(function () {
            this.where({ request_to_all: true, family_id: user.family_id, status: 'pending' });
          })
          .count('* as count')
          .first();
        const count = Number(pendingRequests.count);
        if (count > 0) {
          parts.push(`${count} pending request${count > 1 ? 's' : ''}`);
        }
      }

      // Check tasks due today (assigned to this user, not completed)
      if (user.notify_tasks_due !== false) {
        const tasksDue = await db('tasks')
          .where(function () {
            this.where({ assigned_to: user.id }).orWhere({ assign_to_all: true, family_id: user.family_id });
          })
          .where({ deadline: today })
          .whereNot({ status: 'completed' })
          .whereNot({ status: 'rejected' })
          .count('* as count')
          .first();
        const count = Number(tasksDue.count);
        if (count > 0) {
          parts.push(`${count} task${count > 1 ? 's' : ''} due today`);
        }
      }

      // Check active events (today, not yet ended)
      if (user.notify_active_events !== false) {
        const activeEvents = await db('events')
          .where(function () {
            this.where({ requested_to: user.id }).orWhere({ request_to_all: true, family_id: user.family_id });
          })
          .where({ event_date: today })
          .where(function () {
            // Events with no end_time or end_time hasn't passed yet
            this.whereNull('end_time').orWhere('end_time', '>=', now);
          })
          .whereNot({ status: 'rejected' })
          .count('* as count')
          .first();
        const count = Number(activeEvents.count);
        if (count > 0) {
          parts.push(`${count} event${count > 1 ? 's' : ''} today`);
        }
      }

      if (parts.length > 0) {
        const body = `You have ${parts.join(', ')}`;
        await sendPushNotification(user.id, {
          title: 'FamilySync',
          body,
          url: '/dashboard',
          tag: 'daily-summary',
        });
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Notification scheduler error');
  }
}

let intervalId = null;

function start() {
  if (!isConfigured()) {
    logger.info('Push notifications not configured, skipping notification scheduler');
    return;
  }

  // Run first check after a short delay (let server fully start)
  setTimeout(() => {
    checkAndNotify();
    intervalId = setInterval(checkAndNotify, CHECK_INTERVAL);
  }, 30 * 1000);

  logger.info('Notification scheduler started (every 15 minutes)');
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { start, stop, checkAndNotify };
