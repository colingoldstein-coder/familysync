const updates = [
  { key: 'usecase-morning', image_url: '/images/site/child-feeding-pet.png' },
  { key: 'usecase-homework', image_url: '/images/site/child-writing.png' },
  { key: 'usecase-chores', image_url: '/images/site/child-making-bed.png' },
  { key: 'usecase-project', image_url: '/images/site/children-party.png' },
];

exports.up = async function (knex) {
  for (const { key, image_url } of updates) {
    await knex('site_images').where({ key }).update({ image_url });
  }
};

exports.down = async function (knex) {
  for (const { key, image_url } of updates) {
    await knex('site_images').where({ key }).update({ image_url: image_url.replace('/images/site/', '/api/uploads/') });
  }
};
