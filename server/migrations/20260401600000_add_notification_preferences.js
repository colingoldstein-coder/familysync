exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('notify_pending_requests').notNullable().defaultTo(true);
    t.boolean('notify_tasks_due').notNullable().defaultTo(true);
    t.boolean('notify_active_events').notNullable().defaultTo(true);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('notify_pending_requests');
    t.dropColumn('notify_tasks_due');
    t.dropColumn('notify_active_events');
  });
};
