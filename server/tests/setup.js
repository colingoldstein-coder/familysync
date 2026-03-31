const db = require('../db');

async function setup() {
  await db.migrate.latest();
}

async function teardown() {
  await db.raw('PRAGMA foreign_keys = OFF').catch(() => {});
  await db.migrate.rollback(undefined, true);
  await db.destroy();
}

async function cleanup() {
  await db('email_log').del().catch(() => {});
  await db('push_subscriptions').del().catch(() => {});
  await db('help_requests').del();
  await db('tasks').del();
  await db('invitations').del();
  await db('users').del();
  await db('families').del();
}

module.exports = { setup, teardown, cleanup };
