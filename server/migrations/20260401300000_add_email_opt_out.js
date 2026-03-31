exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('email_opt_out').notNullable().defaultTo(false);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('email_opt_out');
  });
};
