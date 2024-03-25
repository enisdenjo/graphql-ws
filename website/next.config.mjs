// @ts-expect-error the guild's next config doesnt have types
import { withGuildDocs } from '@theguild/components/next.config';
export default withGuildDocs({
  output: 'export',
});
