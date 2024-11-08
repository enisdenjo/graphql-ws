/**
 * @type {import('jest').Config}
 */
const opts = {
  testEnvironment: 'node',
  testRunner: 'jest-jasmine2', // until https://github.com/facebook/jest/issues/11698 and hopefully https://github.com/facebook/jest/issues/10529
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/', '/utils/', 'd.ts$'],
  moduleNameMapper: {
    "^ws$": "<rootDir>/node_modules/ws/index.js"
  }
};
module.exports = opts;
