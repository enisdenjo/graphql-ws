import fsp from 'fs/promises';
import path from 'path';

const docsDir = path.join('website', 'src', 'pages', 'docs');

(async function main() {
  await fixLinksInDir(docsDir);
  await createRecursiveMetaFiles(docsDir);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Fixes links in markdown files by removing the `.md` extension and by removing the last `/index` if available.
 *
 * @param {string} dirPath
 */
async function fixLinksInDir(dirPath) {
  for (const file of await fsp.readdir(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      // recursively fix links in files
      fixLinksInDir(filePath);
      continue;
    }
    if (!file.name.endsWith('.md')) {
      continue;
    }
    const contents = await fsp.readFile(filePath);
    let src = contents.toString();

    // remove .md extensions everywhere
    src = src.replaceAll('.md', '');
    // remove /index from all links `](/some/where/index)` -> `](/some/where)`
    src = src.replaceAll(/]\((.*)\/index\)/g, ']($1)');

    await fsp.writeFile(filePath, src);
  }
}

/**
 * Creates the `_meta.json` metadata file for Next.js.
 *
 * @param {string} dirPath
 */
async function createRecursiveMetaFiles(dirPath) {
  /** @type {Record<string, string>} */
  const meta = {};

  const files = await fsp.readdir(dirPath, { withFileTypes: true });
  if (files.find((file) => file.name === 'index.md')) {
    meta.index = 'Home';
  }
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      // uppercase first character
      meta[file.name] = file.name.charAt(0).toUpperCase() + file.name.slice(1);

      createRecursiveMetaFiles(filePath);
      continue;
    }
    if (!file.name.endsWith('.md')) {
      continue;
    }
    if (file.name === 'index.md') {
      continue;
    }
    const nameNoExt = file.name.slice(0, -3);
    if (nameNoExt === 'use__fastify_websocket') {
      meta[nameNoExt] = 'use/@fastify/websocket';
    } else {
      meta[nameNoExt] = nameNoExt.replaceAll('_', '/');
    }
  }

  await fsp.writeFile(
    path.join(dirPath, '_meta.ts'),
    'export default ' + JSON.stringify(meta, null, '  ') + '\n',
  );
}
