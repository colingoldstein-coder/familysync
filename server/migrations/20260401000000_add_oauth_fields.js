exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('oauth_provider', 50).nullable();
    t.string('oauth_provider_id', 255).nullable();
    t.string('password_hash', 255).nullable().alter();
    t.unique(['oauth_provider', 'oauth_provider_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropUnique(['oauth_provider', 'oauth_provider_id']);
    t.dropColumn('oauth_provider');
    t.dropColumn('oauth_provider_id');
    t.string('password_hash', 255).notNullable().alter();
  });
};
