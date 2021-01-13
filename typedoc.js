module.exports = {
  out: './docs',
  readme: 'none',
  plugin: 'typedoc-plugin-markdown',
  excludeExternals: true,
  disableSources: true,
  exclude: ['**/index.ts', '**/utils.ts', '**/tests/**/*'],
};
