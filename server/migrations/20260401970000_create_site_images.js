exports.up = async function (knex) {
  await knex.schema.createTable('site_images', (table) => {
    table.increments('id').primary();
    table.string('key').unique().notNullable();
    table.string('label').notNullable();
    table.string('image_url');
    table.string('alt_text');
    table.timestamps(true, true);
  });

  // Seed default keys for landing page use-case sections
  await knex('site_images').insert([
    { key: 'usecase-morning', label: 'Morning Routines', alt_text: 'Family morning routine' },
    { key: 'usecase-homework', label: 'Homework Tracking', alt_text: 'Parent helping child with homework' },
    { key: 'usecase-chores', label: 'Household Chores', alt_text: 'Family doing household chores' },
    { key: 'usecase-project', label: 'Family Projects', alt_text: 'Family working on a project together' },
  ]);
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('site_images');
};
