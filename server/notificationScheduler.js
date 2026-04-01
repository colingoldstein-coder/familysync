const db = require('./db');
const { sendPushNotification, isConfigured } = require('./notifications');
const logger = require('./logger');

// Runs every 15 minutes, checks for pending items and sends summary push notifications
const CHECK_INTERVAL = 15 * 60 * 1000;
// Don't re-notify users within this window (2 hours)
const NOTIFY_COOLDOWN_MS = 2 * 60 * 60 * 1000;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeString() {
  return new Date().toTimeString().slice(0, 5);
}

async function checkAndNotify() {
  if (!isConfigured()) return;

  try {
    const cooldownCutoff = new Date(Date.now() - NOTIFY_COOLDOWN_MS).toISOString();

    // Get users with push subscriptions who haven't been notified recently
    const users = await db('push_subscriptions')
      .join('users', 'users.id', 'push_subscriptions.user_id')
      .where('users.is_active', true)
      .where(function () {
        this.whereNull('users.last_summary_notified_at')
          .orWhere('users.last_summary_notified_at', '<', cooldownCutoff);
      })
      .select('users.id', 'users.family_id',
        'users.notify_pending_requests', 'users.notify_tasks_due', 'users.notify_active_events')
      .groupBy('users.id', 'users.family_id',
        'users.notify_pending_requests', 'users.notify_tasks_due', 'users.notify_active_events');

    if (users.length === 0) return;

    const today = todayDateString();
    const now = nowTimeString();
    const userIds = users.map(u => u.id);
    const familyIds = [...new Set(users.map(u => u.family_id))];

    // Batch query: pending requests for all relevant users at once
    const pendingRequestCounts = await db('help_requests')
      .where({ status: 'pending' })
      .whereIn('family_id', familyIds)
      .select('requested_to', 'request_to_all', 'family_id')
      .then(rows => {
        // Build a map: userId -> count
        const counts = {};
        for (const row of rows) {
          if (row.request_to_all) {
            // Count for all users in that family
            for (const u of users) {
              if (u.family_id === row.family_id) {
                counts[u.id] = (counts[u.id] || 0) + 1;
              }
            }
          } else if (row.requested_to) {
            counts[row.requested_to] = (counts[row.requested_to] || 0) + 1;
          }
        }
        return counts;
      });

    // Batch query: tasks due today for all relevant users
    const tasksDueCounts = await db('tasks')
      .where({ deadline: today })
      .whereNotIn('status', ['completed', 'rejected'])
      .whereIn('family_id', familyIds)
      .select('assigned_to', 'assign_to_all', 'family_id')
      .then(rows => {
        const counts = {};
        for (const row of rows) {
          if (row.assign_to_all) {
            for (const u of users) {
              if (u.family_id === row.family_id) {
                counts[u.id] = (counts[u.id] || 0) + 1;
              }
            }
          } else if (row.assigned_to) {
            counts[row.assigned_to] = (counts[row.assigned_to] || 0) + 1;
          }
        }
        return counts;
      });

    // Batch query: active events today for all relevant users
    const activeEventCounts = await db('events')
      .where({ event_date: today })
      .whereNot({ status: 'rejected' })
      .where(function () {
        this.whereNull('end_time').orWhere('end_time', '>=', now);
      })
      .whereIn('family_id', familyIds)
      .select('requested_to', 'request_to_all', 'family_id')
      .then(rows => {
        const counts = {};
        for (const row of rows) {
          if (row.request_to_all) {
            for (const u of users) {
              if (u.family_id === row.family_id) {
                counts[u.id] = (counts[u.id] || 0) + 1;
              }
            }
          } else if (row.requested_to) {
            counts[row.requested_to] = (counts[row.requested_to] || 0) + 1;
          }
        }
        return counts;
      });

    // Send notifications and track who was notified
    const notifiedUserIds = [];

    for (const user of users) {
      const parts = [];

      if (user.notify_pending_requests !== false && pendingRequestCounts[user.id]) {
        const c = pendingRequestCounts[user.id];
        parts.push(`${c} pending request${c > 1 ? 's' : ''}`);
      }
      if (user.notify_tasks_due !== false && tasksDueCounts[user.id]) {
        const c = tasksDueCounts[user.id];
        parts.push(`${c} task${c > 1 ? 's' : ''} due today`);
      }
      if (user.notify_active_events !== false && activeEventCounts[user.id]) {
        const c = activeEventCounts[user.id];
        parts.push(`${c} event${c > 1 ? 's' : ''} today`);
      }

      if (parts.length > 0) {
        await sendPushNotification(user.id, {
          title: 'FamilySync',
          body: `You have ${parts.join(', ')}`,
          url: '/dashboard',
          tag: 'daily-summary',
        });
        notifiedUserIds.push(user.id);
      }
    }

    // Update last_summary_notified_at for users who received notifications
    if (notifiedUserIds.length > 0) {
      await db('users')
        .whereIn('id', notifiedUserIds)
        .update({ last_summary_notified_at: db.fn.now() });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Notification scheduler error');
  }
}

let intervalId = null;
let startupTimeout = null;

function start() {
  if (!isConfigured()) {
    logger.info('Push notifications not configured, skipping notification scheduler');
    return;
  }

  // Run first check after a short delay (let server fully start)
  startupTimeout = setTimeout(() => {
    checkAndNotify();
    intervalId = setInterval(checkAndNotify, CHECK_INTERVAL);
  }, 30 * 1000);

  logger.info('Notification scheduler started (every 15 minutes, 2h cooldown per user)');
}

function stop() {
  if (startupTimeout) {
    clearTimeout(startupTimeout);
    startupTimeout = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { start, stop, checkAndNotify };
