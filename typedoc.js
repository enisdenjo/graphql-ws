module.exports = {
  out: './docs',
  readme: 'none',
  plugin: 'typedoc-plugin-markdown',
  excludeExternals: true,
  excludePrivate: true,
  disableSources: true,
  categorizeByGroup: false, // removes redundant category names in matching modules
  exclude: ['**/index.ts', '**/utils.ts', '**/__tests__/**/*'],
};
