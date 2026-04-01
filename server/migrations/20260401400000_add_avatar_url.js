exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('avatar_url', 500).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('avatar_url');
  });
};
