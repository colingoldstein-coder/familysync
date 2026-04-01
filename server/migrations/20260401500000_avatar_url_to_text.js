exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.text('avatar_url').nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('avatar_url', 500).nullable().alter();
  });
};
