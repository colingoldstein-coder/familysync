exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.boolean('profile_setup_complete').defaultTo(true);
    table.boolean('profile_reminder_dismissed').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('profile_setup_complete');
    table.dropColumn('profile_reminder_dismissed');
  });
};
