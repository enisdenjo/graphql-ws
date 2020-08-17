module.exports = {
  includeDeclarations: true,
  out: './docs',
  readme: 'none',
  plugin: 'typedoc-plugin-markdown',
  excludeExternals: true,
  excludeNotExported: true,
  exclude: ['**/utils.ts', '**/tests/**/*'],
};
