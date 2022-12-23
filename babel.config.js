/**
 * @type {import('@babel/core').TransformOptions}
 */
const opts = {
  presets: [
    ['@babel/env', { targets: { node: 'current' } }],
    '@babel/typescript',
  ],
  plugins: [
    '@babel/proposal-class-properties',
    '@babel/proposal-object-rest-spread',
    '@babel/proposal-nullish-coalescing-operator',
    '@babel/proposal-optional-chaining',
  ],
};
module.exports = opts;
