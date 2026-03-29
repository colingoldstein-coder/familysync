exports.up = function (knex) {
  return knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.date('event_date').notNullable();
    table.string('event_time', 5).notNullable();           // HH:MM
    table.string('end_time', 5).nullable();                 // HH:MM (optional end time)
    table.enu('event_type', ['drop_off', 'pick_up', 'both']).notNullable();
    table.string('location_name').nullable();                // e.g. "Sarah's house"
    table.string('location_address').nullable();             // full address
    table.integer('requested_by').unsigned().notNullable().references('id').inTable('users');
    table.integer('requested_to').unsigned().references('id').inTable('users');
    table.boolean('request_to_all').defaultTo(false);
    table.integer('family_id').unsigned().notNullable().references('id').inTable('families');
    table.enu('status', ['pending', 'accepted', 'rejected']).defaultTo('pending');
    table.integer('accepted_by').unsigned().references('id').inTable('users');
    table.integer('travel_time_before').defaultTo(0);        // minutes parent adds
    table.integer('travel_time_after').defaultTo(0);         // minutes parent adds
    table.text('parent_notes').nullable();                   // parent can add notes
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('events');
};
