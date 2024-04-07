/**
 * @type {import('next-sitemap').IConfig}
 */
const opts = {
  siteUrl: process.env.SITE_URL || 'https://the-guild.dev/graphql/ws',
  generateIndexSitemap: false,
  exclude: ['*/_meta'],
  output: 'export',
};
module.exports = opts;
