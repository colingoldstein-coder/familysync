exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.index('email');
    t.index('family_id');
  });
  await knex.schema.alterTable('tasks', (t) => {
    t.index(['family_id', 'status']);
    t.index('assigned_to');
    t.index('deadline');
    t.index('created_at');
  });
  await knex.schema.alterTable('help_requests', (t) => {
    t.index(['family_id', 'status']);
    t.index('requested_to');
  });
  await knex.schema.alterTable('events', (t) => {
    t.index(['family_id', 'status']);
    t.index('event_date');
    t.index('requested_to');
  });
  await knex.schema.alterTable('invitations', (t) => {
    t.index(['family_id', 'status']);
    t.index('token');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropIndex('email');
    t.dropIndex('family_id');
  });
  await knex.schema.alterTable('tasks', (t) => {
    t.dropIndex(['family_id', 'status']);
    t.dropIndex('assigned_to');
    t.dropIndex('deadline');
    t.dropIndex('created_at');
  });
  await knex.schema.alterTable('help_requests', (t) => {
    t.dropIndex(['family_id', 'status']);
    t.dropIndex('requested_to');
  });
  await knex.schema.alterTable('events', (t) => {
    t.dropIndex(['family_id', 'status']);
    t.dropIndex('event_date');
    t.dropIndex('requested_to');
  });
  await knex.schema.alterTable('invitations', (t) => {
    t.dropIndex(['family_id', 'status']);
    t.dropIndex('token');
  });
};
