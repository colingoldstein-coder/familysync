exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('oauth_provider', 50).nullable();
    t.string('oauth_provider_id', 255).nullable();
    t.unique(['oauth_provider', 'oauth_provider_id']);
  });
  // Make password_hash nullable for social-only users
  if (knex.client.config.client === 'pg') {
    await knex.raw('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
  }
};

exports.down = async function (knex) {
  if (knex.client.config.client === 'pg') {
    await knex.raw('ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL');
  }
  await knex.schema.alterTable('users', (t) => {
    t.dropUnique(['oauth_provider', 'oauth_provider_id']);
    t.dropColumn('oauth_provider');
    t.dropColumn('oauth_provider_id');
  });
};
