const app = require('./app');
const db = require('./db');
const logger = require('./logger');

const PORT = process.env.PORT || 3001;

console.log(`[startup] NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

db.migrate.latest()
  .then(() => {
    console.log('[startup] Migrations complete');
    logger.info('Migrations complete');
    return db.seed.run();
  })
  .then(() => {
    console.log('[startup] Seeds complete');
    logger.info('Seeds complete');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[startup] Server listening on 0.0.0.0:${PORT}`);
      logger.info(`FamilySync server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`[startup] FATAL: ${err.message}`);
    console.error(err.stack);
    logger.error({ err: err.message, stack: err.stack }, 'Failed to run migrations');
    process.exit(1);
  });
