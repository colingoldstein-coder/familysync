exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('notify_new_requests').defaultTo(true);
    table.boolean('notify_new_events').defaultTo(true);
    table.boolean('notify_responses').defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('notify_new_requests');
    table.dropColumn('notify_new_events');
    table.dropColumn('notify_responses');
  });
};
