exports.up = function (knex) {
  return knex.schema.alterTable('tasks', (table) => {
    table.date('deadline').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('tasks', (table) => {
    table.dropColumn('deadline');
  });
};
