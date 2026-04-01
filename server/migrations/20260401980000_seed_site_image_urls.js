const imageMap = {
  'usecase-morning': '/api/uploads/morning-routine.jpg',
  'usecase-homework': '/api/uploads/homework-help.jpg',
  'usecase-chores': '/api/uploads/household-chores.jpg',
  'usecase-project': '/api/uploads/family-project.jpg',
};

exports.up = async function (knex) {
  for (const [key, url] of Object.entries(imageMap)) {
    await knex('site_images').where({ key }).update({ image_url: url });
  }
};

exports.down = async function (knex) {
  for (const key of Object.keys(imageMap)) {
    await knex('site_images').where({ key }).update({ image_url: null });
  }
};
