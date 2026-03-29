const app = require('./app');
const db = require('./db');
const logger = require('./logger');

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

db.migrate.latest()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`FamilySync server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
    });
  })
  .catch((err) => {
    logger.error(err, 'Failed to run migrations');
    process.exit(1);
  });
