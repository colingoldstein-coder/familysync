exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.timestamp('webauthn_challenge_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('webauthn_challenge_at');
  });
};
