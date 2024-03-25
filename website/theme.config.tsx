import { defineConfig, PRODUCTS } from '@theguild/components';

export default defineConfig({
  websiteName: 'GraphQL-WebSocket',
  description:
    'Coherent, simple GraphQL over WebSocket protocol compliant server and client.',
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  logo: PRODUCTS.WS.logo({ className: 'w-9' }),
});
