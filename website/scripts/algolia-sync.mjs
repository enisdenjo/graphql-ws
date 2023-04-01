import { indexToAlgolia } from '@theguild/algolia';

indexToAlgolia({
  nextra: {
    docsBaseDir: 'src/pages/',
  },
  source: 'WS',
  domain: process.env.SITE_URL,
  lockfilePath: 'algolia-lockfile.json',
  dryMode: process.env.ALGOLIA_DRY_RUN === 'true',
});
