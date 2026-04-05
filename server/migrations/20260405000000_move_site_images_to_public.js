const updates = [
  { key: 'usecase-morning', image_url: '/images/site/child-feeding-pet.jpg' },
  { key: 'usecase-homework', image_url: '/images/site/child-writing.jpg' },
  { key: 'usecase-chores', image_url: '/images/site/child-making-bed.jpg' },
  { key: 'usecase-project', image_url: '/images/site/children-party.jpg' },
];

const rollback = [
  { key: 'usecase-morning', image_url: '/api/uploads/child-feeding-pet.jpg' },
  { key: 'usecase-homework', image_url: '/api/uploads/child-writing.jpg' },
  { key: 'usecase-chores', image_url: '/api/uploads/child-making-bed.jpg' },
  { key: 'usecase-project', image_url: '/api/uploads/children-party.jpg' },
];

exports.up = async function (knex) {
  for (const { key, image_url } of updates) {
    await knex('site_images').where({ key }).update({ image_url });
  }
};

exports.down = async function (knex) {
  for (const { key, image_url } of rollback) {
    await knex('site_images').where({ key }).update({ image_url });
  }
};
