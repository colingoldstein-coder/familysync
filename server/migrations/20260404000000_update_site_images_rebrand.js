const updates = [
  {
    key: 'usecase-morning',
    image_url: '/api/uploads/child-feeding-pet.jpg',
    alt_text: 'Child feeding a pet dog',
  },
  {
    key: 'usecase-homework',
    image_url: '/api/uploads/child-writing.jpg',
    alt_text: 'Child writing in a notebook',
  },
  {
    key: 'usecase-chores',
    image_url: '/api/uploads/child-making-bed.jpg',
    alt_text: 'Child making their bed',
  },
  {
    key: 'usecase-project',
    label: 'Family Events',
    image_url: '/api/uploads/children-party.jpg',
    alt_text: 'Children at a birthday party',
  },
];

const rollback = [
  { key: 'usecase-morning', image_url: '/api/uploads/morning-routine.jpg', alt_text: 'Family morning routine' },
  { key: 'usecase-homework', image_url: '/api/uploads/homework-help.jpg', alt_text: 'Parent helping child with homework' },
  { key: 'usecase-chores', image_url: '/api/uploads/household-chores.jpg', alt_text: 'Family doing household chores' },
  { key: 'usecase-project', label: 'Family Projects', image_url: '/api/uploads/family-project.jpg', alt_text: 'Family working on a project together' },
];

exports.up = async function (knex) {
  for (const { key, ...fields } of updates) {
    await knex('site_images').where({ key }).update(fields);
  }
};

exports.down = async function (knex) {
  for (const { key, ...fields } of rollback) {
    await knex('site_images').where({ key }).update(fields);
  }
};
