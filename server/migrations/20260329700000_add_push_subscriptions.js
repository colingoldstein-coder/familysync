exports.up = function (knex) {
  return knex.schema.createTable('push_subscriptions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.text('endpoint').notNullable();
    table.text('keys_p256dh').notNullable();
    table.text('keys_auth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'endpoint']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('push_subscriptions');
};
