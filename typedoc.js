module.exports = {
  includeDeclarations: true,
  out: './docs',
  readme: 'none',
  plugin: 'typedoc-plugin-markdown',
  excludeExternals: true,
  excludeNotExported: true,
  exclude: ['**/index.ts', '**/utils.ts', '**/tests/**/*'],
};
