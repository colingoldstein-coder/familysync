const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Skipping admin seed: ADMIN_EMAIL and ADMIN_PASSWORD not set');
    return;
  }

  const existing = await knex('users').where({ email }).first();
  if (existing) {
    // Ensure super admin flag is set
    await knex('users').where({ id: existing.id }).update({ is_super_admin: true });
    console.log('Admin user already exists, ensured super admin flag');
    return;
  }

  // Create admin family
  let family = await knex('families').where({ name: 'FamilySync Admin' }).first();
  if (!family) {
    const [inserted] = await knex('families').insert({
      name: 'FamilySync Admin',
      join_code: 'ADMIN0',
    }).returning('id');
    family = { id: inserted.id || inserted };
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  await knex('users').insert({
    name: 'Admin',
    email,
    password_hash: passwordHash,
    role: 'parent',
    is_admin: true,
    is_super_admin: true,
    family_id: family.id,
  });

  console.log(`Admin user created: ${email}`);
};
