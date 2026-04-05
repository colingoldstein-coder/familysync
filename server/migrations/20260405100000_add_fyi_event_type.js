exports.up = async function(knex) {
  // Knex enu() creates a CHECK constraint — drop it and re-add with 'fyi' included
  await knex.raw(`ALTER TABLE events DROP CONSTRAINT IF EXISTS "events_event_type_check"`);
  await knex.raw(`ALTER TABLE events ADD CONSTRAINT "events_event_type_check" CHECK (event_type IN ('drop_off', 'pick_up', 'both', 'fyi'))`);
};

exports.down = async function(knex) {
  await knex.raw(`ALTER TABLE events DROP CONSTRAINT IF EXISTS "events_event_type_check"`);
  await knex.raw(`ALTER TABLE events ADD CONSTRAINT "events_event_type_check" CHECK (event_type IN ('drop_off', 'pick_up', 'both'))`);
};
