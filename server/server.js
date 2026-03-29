const app = require('./app');
const db = require('./db');
const logger = require('./logger');

const PORT = process.env.PORT || 3001;

logger.info({
  NODE_ENV: process.env.NODE_ENV,
  PORT,
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasDbUrl: !!process.env.DATABASE_URL,
  dbClient: process.env.DATABASE_URL ? 'pg' : 'sqlite',
}, 'Starting FamilySync server');

db.migrate.latest()
  .then(() => {
    logger.info('Migrations complete');
    app.listen(PORT, () => {
      logger.info(`FamilySync server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error({ err: err.message, stack: err.stack }, 'Failed to run migrations');
    process.exit(1);
  });
