exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('calendar_token').unique().nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('calendar_token');
  });
};
