module.exports = {
  testEnvironment: 'node',
  testRunner: 'jest-jasmine2', // until https://github.com/facebook/jest/issues/11698 and hopefully https://github.com/facebook/jest/issues/10529
  moduleFileExtensions: ['ts', 'js'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/', '/utils/'],
};
