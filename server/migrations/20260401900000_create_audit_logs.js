exports.up = async function (knex) {
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.string('action', 100).notNullable();
    t.integer('actor_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.integer('target_id').unsigned().nullable();
    t.string('target_type', 50).nullable();
    t.text('details').nullable();
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('audit_logs', (t) => {
    t.index('action');
    t.index('actor_id');
    t.index('created_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('audit_logs');
};
