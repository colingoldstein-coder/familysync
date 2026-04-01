const app = require('./app');
const db = require('./db');
const logger = require('./logger');
const notificationScheduler = require('./notificationScheduler');

const PORT = process.env.PORT || 3001;

let server;

db.migrate.latest()
  .then(() => {
    logger.info('Migrations complete');
    return db.seed.run();
  })
  .then(() => {
    logger.info('Seeds complete');
    server = app.listen(PORT, () => {
      logger.info(`FamilySync server running on port ${PORT}`);
      notificationScheduler.start();
    });
  })
  .catch((err) => {
    logger.error({ err: err.message }, 'Failed to run migrations');
    process.exit(1);
  });

// Graceful shutdown on SIGTERM (Railway sends this during deploys)
function shutdown() {
  logger.info('Shutting down gracefully...');
  notificationScheduler.stop();
  if (server) {
    server.close(() => {
      db.destroy().then(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      });
    });
  } else {
    db.destroy().then(() => process.exit(0));
  }
  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
