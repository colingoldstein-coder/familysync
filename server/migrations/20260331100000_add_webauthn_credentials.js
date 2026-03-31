/**
 * Store WebAuthn credentials for biometric login.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('webauthn_credentials', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('credential_id').notNullable().unique();
    t.text('public_key').notNullable();
    t.bigInteger('counter').notNullable().defaultTo(0);
    t.string('device_name', 100).defaultTo('');
    t.string('transports', 200); // JSON array of transports
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Store current challenge per user for registration/login flow
  await knex.schema.alterTable('users', (t) => {
    t.text('webauthn_challenge');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('webauthn_credentials');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('webauthn_challenge');
  });
};
