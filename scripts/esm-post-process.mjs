import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';

const rootDir = 'lib';

glob(`${rootDir}/**/*.js`, async (_, matches) => {
  for (const path of matches) {
    await buildEsm(path);
  }

  // we delete after build to not mess with import/export statement replacer
  for (const path of matches) {
    await fs.unlink(path);
  }
});

glob(`${rootDir}/**/*.d.ts`, async (_, matches) => {
  for (const path of matches) {
    await buildEsm(path);
  }

  // we dont delete raw d.ts files, they're still needed for imports/exports
});

/**
 * @param {string} filePath
 */
async function buildEsm(filePath) {
  const pathParts = filePath.split('.');
  const fileExt = pathParts.pop();

  const file = await fs.readFile(path.join(process.cwd(), filePath));
  let content = file.toString();

  if (fileExt === 'js') {
    // add .mjs to all import/export statements, but only on files (keep directory imports as is)
    for (const match of content.matchAll(/from '(\.?\.\/[^']*)'/g)) {
      const [statement, relImportPath] = match;
      const absImportPath = path.resolve(
        process.cwd(),
        path.dirname(filePath),
        relImportPath,
      );

      try {
        await fs.stat(absImportPath + '.js');

        // file import
        content = content.replace(statement, `from '${relImportPath}.mjs'`);
      } catch {
        // directory import
        content = content.replace(
          statement,
          `from '${relImportPath}/index.mjs'`,
        );
      }
    }
  }

  // write to file with prepended "m" in extension (.js -> .mjs, .ts -> .mts)
  const esmFilePath = pathParts.join('.') + '.m' + fileExt;
  await fs.writeFile(esmFilePath, content);
}
