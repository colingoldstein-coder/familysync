const app = require('./app');
const db = require('./db');
const logger = require('./logger');

const PORT = process.env.PORT || 3001;

db.migrate.latest()
  .then(() => {
    logger.info('Migrations complete');
    return db.seed.run();
  })
  .then(() => {
    logger.info('Seeds complete');
    app.listen(PORT, () => {
      logger.info(`FamilySync server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error({ err: err.message }, 'Failed to run migrations');
    process.exit(1);
  });
