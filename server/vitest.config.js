const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-for-vitest-do-not-use-in-production',
    },
  },
});
