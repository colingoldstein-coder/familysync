/**
 * Add unique reference numbers to users and families.
 * Users:    FS-U-00001, FS-U-00002, ...
 * Families: FS-F-00001, FS-F-00002, ...
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('ref_number', 12).unique();
  });
  await knex.schema.alterTable('families', (t) => {
    t.string('ref_number', 12).unique();
  });

  // Backfill existing users
  const users = await knex('users').select('id').orderBy('id');
  for (let i = 0; i < users.length; i++) {
    const ref = `FS-U-${String(i + 1).padStart(5, '0')}`;
    await knex('users').where({ id: users[i].id }).update({ ref_number: ref });
  }

  // Backfill existing families
  const families = await knex('families').select('id').orderBy('id');
  for (let i = 0; i < families.length; i++) {
    const ref = `FS-F-${String(i + 1).padStart(5, '0')}`;
    await knex('families').where({ id: families[i].id }).update({ ref_number: ref });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('ref_number');
  });
  await knex.schema.alterTable('families', (t) => {
    t.dropColumn('ref_number');
  });
};
