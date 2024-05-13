const { resolve } = require('path');

const root = resolve(__dirname, '..');
const rootConfig = require(`${root}/jest.config.js`);

module.exports = {
  ...rootConfig,
  rootDir: root,
  displayName: 'end2end-tests',
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.ts'], // Importante
  testMatch: ['<rootDir>/test/**/*.test.ts'],
};
