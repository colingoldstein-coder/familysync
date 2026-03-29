const db = require('../db');

async function setup() {
  await db.migrate.latest();
}

async function teardown() {
  await db.migrate.rollback();
  await db.destroy();
}

async function cleanup() {
  await db('help_requests').del();
  await db('tasks').del();
  await db('invitations').del();
  await db('users').del();
  await db('families').del();
}

module.exports = { setup, teardown, cleanup };
