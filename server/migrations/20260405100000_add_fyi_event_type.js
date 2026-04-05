exports.up = async function(knex) {
  const client = knex.client.config.client;
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    // SQLite doesn't enforce CHECK constraints from knex enu() — no action needed
    return;
  }
  // PostgreSQL: drop old CHECK constraint and re-add with 'fyi' included
  await knex.raw(`ALTER TABLE events DROP CONSTRAINT IF EXISTS "events_event_type_check"`);
  await knex.raw(`ALTER TABLE events ADD CONSTRAINT "events_event_type_check" CHECK (event_type IN ('drop_off', 'pick_up', 'both', 'fyi'))`);
};

exports.down = async function(knex) {
  const client = knex.client.config.client;
  if (client === 'better-sqlite3' || client === 'sqlite3') {
    return;
  }
  await knex.raw(`ALTER TABLE events DROP CONSTRAINT IF EXISTS "events_event_type_check"`);
  await knex.raw(`ALTER TABLE events ADD CONSTRAINT "events_event_type_check" CHECK (event_type IN ('drop_off', 'pick_up', 'both'))`);
};
