import { defineConfig, PRODUCTS } from '@theguild/components';

export default defineConfig({
  websiteName: PRODUCTS.WS.name,
  description: PRODUCTS.WS.title,
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  logo: PRODUCTS.WS.logo({ className: 'w-9' }),
});
