import { defineConfig, useTheme } from '@theguild/components';

export default defineConfig({
  siteName: 'WS',
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  main({ children }) {
    useTheme();
    return <>{children}</>;
  },
});
