exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.timestamp('last_summary_notified_at').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('last_summary_notified_at');
  });
};
