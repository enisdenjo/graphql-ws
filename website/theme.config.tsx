import { defineConfig, PRODUCTS } from '@theguild/components';

export default defineConfig({
  websiteName:
    'Coherent, simple GraphQL over WebSocket protocol compliant server and client.',
  description: PRODUCTS.WS.title,
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  logo: PRODUCTS.WS.logo({ className: 'w-8' }),
});
