import { defineConfig, useTheme } from '@theguild/components';

const siteName = 'GraphQL WS';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  logo: (
    <div>
      <h1 className="md:text-md text-sm font-medium">{siteName}</h1>
      <h2 className="hidden text-xs sm:block">
        Reference implementation of the GraphQL over WS spec
      </h2>
    </div>
  ),
  main({ children }) {
    useTheme();
    return <>{children}</>;
  },
  siteName,
});
