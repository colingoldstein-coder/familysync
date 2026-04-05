exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('notify_new_tasks').defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('notify_new_tasks');
  });
};
