exports.up = function (knex) {
  return knex.schema
    .alterTable('tasks', (table) => {
      table.string('recurrence_type').defaultTo('none');       // none, daily, weekly, monthly, custom
      table.integer('recurrence_interval').defaultTo(1);       // every N (days/weeks/months)
      table.string('recurrence_unit').defaultTo('week');       // day, week, month (for custom)
      table.string('recurrence_days').nullable();              // comma-separated day numbers for weekly (0=Sun..6=Sat)
      table.date('recurrence_end').nullable();                 // optional end date
      table.string('series_id').nullable();                    // groups recurring instances together
    })
    .alterTable('help_requests', (table) => {
      table.string('recurrence_type').defaultTo('none');
      table.integer('recurrence_interval').defaultTo(1);
      table.string('recurrence_unit').defaultTo('week');
      table.string('recurrence_days').nullable();
      table.date('recurrence_end').nullable();
      table.string('series_id').nullable();
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('tasks', (table) => {
      table.dropColumn('recurrence_type');
      table.dropColumn('recurrence_interval');
      table.dropColumn('recurrence_unit');
      table.dropColumn('recurrence_days');
      table.dropColumn('recurrence_end');
      table.dropColumn('series_id');
    })
    .alterTable('help_requests', (table) => {
      table.dropColumn('recurrence_type');
      table.dropColumn('recurrence_interval');
      table.dropColumn('recurrence_unit');
      table.dropColumn('recurrence_days');
      table.dropColumn('recurrence_end');
      table.dropColumn('series_id');
    });
};
