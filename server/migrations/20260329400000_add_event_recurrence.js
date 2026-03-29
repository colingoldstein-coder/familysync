exports.up = function (knex) {
  return knex.schema.alterTable('events', (table) => {
    table.string('recurrence_type').defaultTo('none');
    table.integer('recurrence_interval').defaultTo(1);
    table.string('recurrence_unit').defaultTo('week');
    table.string('recurrence_days').nullable();
    table.date('recurrence_end').nullable();
    table.string('series_id').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('events', (table) => {
    table.dropColumn('recurrence_type');
    table.dropColumn('recurrence_interval');
    table.dropColumn('recurrence_unit');
    table.dropColumn('recurrence_days');
    table.dropColumn('recurrence_end');
    table.dropColumn('series_id');
  });
};
