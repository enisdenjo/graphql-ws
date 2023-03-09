/**
 * @type {Partial<import('typedoc').TypeDocOptions> & Partial<import('typedoc-plugin-markdown').MarkdownTheme>}
 */
const opts = {
  entryPointStrategy: 'expand',
  out: './website/src/pages/docs',
  readme: 'none',
  plugin: ['typedoc-plugin-markdown'],
  excludeExternals: true,
  excludePrivate: true,
  categorizeByGroup: false, // removes redundant category names in matching modules
  githubPages: false,
  exclude: ['**/index.ts', '**/utils.ts', '**/parser.ts', '**/__tests__/**/*'],
  entryDocument: 'index.md',
  hideInPageTOC: true,
  publicPath: '/docs/',
  hideBreadcrumbs: true,
};
module.exports = opts;
