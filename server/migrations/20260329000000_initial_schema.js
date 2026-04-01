exports.up = function (knex) {
  return knex.schema
    .createTable('families', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('join_code').unique().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.enu('role', ['parent', 'child']).notNullable();
      table.boolean('is_admin').defaultTo(false);
      table.integer('family_id').unsigned().notNullable().references('id').inTable('families');
      table.string('avatar_color').defaultTo('#0097A7');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('invitations', (table) => {
      table.increments('id').primary();
      table.integer('family_id').unsigned().notNullable().references('id').inTable('families');
      table.string('email').notNullable();
      table.enu('role', ['parent', 'child']).notNullable();
      table.string('token').unique().notNullable();
      table.integer('invited_by').unsigned().notNullable().references('id').inTable('users');
      table.enu('status', ['pending', 'accepted', 'expired']).defaultTo('pending');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('tasks', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.integer('assigned_by').unsigned().notNullable().references('id').inTable('users');
      table.integer('assigned_to').unsigned().references('id').inTable('users');
      table.boolean('assign_to_all').defaultTo(false);
      table.integer('family_id').unsigned().notNullable().references('id').inTable('families');
      table.enu('status', ['pending', 'accepted', 'in_progress', 'completed', 'rejected']).defaultTo('pending');
      table.boolean('rejectable').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('help_requests', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.integer('requested_by').unsigned().notNullable().references('id').inTable('users');
      table.integer('requested_to').unsigned().references('id').inTable('users');
      table.boolean('request_to_all').defaultTo(false);
      table.integer('family_id').unsigned().notNullable().references('id').inTable('families');
      table.enu('status', ['pending', 'accepted', 'rejected']).defaultTo('pending');
      table.integer('accepted_by').unsigned().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('help_requests')
    .dropTableIfExists('tasks')
    .dropTableIfExists('invitations')
    .dropTableIfExists('users')
    .dropTableIfExists('families');
};
