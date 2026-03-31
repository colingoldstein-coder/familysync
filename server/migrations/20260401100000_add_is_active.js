exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.boolean('is_active').notNullable().defaultTo(true);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('is_active');
  });
};
