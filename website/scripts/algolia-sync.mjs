import { indexToAlgolia } from '@theguild/algolia';

const source = 'WS';

const domain = process.env.SITE_URL;
if (!domain) {
  throw new Error('Missing domain');
}

indexToAlgolia({
  nextra: {
    docsBaseDir: 'src/pages/',
    source,
    domain,
    sitemapXmlPath: 'out/sitemap.xml',
  },
  source,
  domain,
  sitemapXmlPath: 'out/sitemap.xml',
  lockfilePath: 'algolia-lockfile.json',
  dryMode: process.env.ALGOLIA_DRY_RUN === 'true',
});
