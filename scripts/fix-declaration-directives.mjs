/**
 * Adding Bun's typings through the tripple-slash directive adds it everywhere
 * where Node primitives are used (probably because Bun and Node share interfaces).
 *
 * This script removes the bun-typings directive everywhere except for Bun.
 */
import { glob } from 'glob';
import fs from 'fs/promises';

(async () => {
  const matches = await glob('lib/**/*.d.?(m)ts');
  const notBunMatches = matches.filter((match) => !match.includes('bun.d'));

  const directive = '/// <reference types="bun-types" />\n';

  for (const path of notBunMatches) {
    const src = (await fs.readFile(path)).toString();
    if (src.includes(src)) {
      await fs.writeFile(path, src.replace(directive, ''));
    }
  }
})();
