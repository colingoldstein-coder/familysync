/**
 * Add token_version to users for JWT invalidation on password change.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.integer('token_version').notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('token_version');
  });
};
