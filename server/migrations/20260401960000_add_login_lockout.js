exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('failed_login_attempts');
    table.dropColumn('locked_until');
  });
};
