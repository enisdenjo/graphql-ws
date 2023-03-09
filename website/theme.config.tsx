import { defineConfig, useTheme } from '@theguild/components';
import Image from 'next/image';

const siteName = 'GraphQL WS';

export default defineConfig({
  docsRepositoryBase: 'https://github.com/enisdenjo/graphql-ws',
  logo: (
    <div className="flex items-center gap-2">
      <div>
        <Image
          priority
          src="/logo.svg"
          width={36}
          height={36}
          alt="GraphQL WS"
        />
      </div>
      <div>
        <h1 className="md:text-md text-sm font-medium">{siteName}</h1>
        <h2 className="hidden text-xs sm:block">
          Reference implementation of the GraphQL over WS spec
        </h2>
      </div>
    </div>
  ),
  main({ children }) {
    useTheme();
    return <>{children}</>;
  },
  siteName,
});
