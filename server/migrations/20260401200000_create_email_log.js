exports.up = async function (knex) {
  await knex.schema.createTable('email_log', (t) => {
    t.increments('id');
    t.integer('sent_by').unsigned().notNullable().references('id').inTable('users');
    t.string('subject', 255).notNullable();
    t.text('body_html').notNullable();
    t.text('recipients').notNullable(); // JSON array of { email, name, userId }
    t.integer('recipient_count').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('sent'); // sent, failed
    t.text('error_message').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('email_log');
};
