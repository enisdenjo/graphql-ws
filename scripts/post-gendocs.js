/**
 * Turns the typedoc-plugin-markdown output in website/content/docs into pages
 * for the-guild-org/website, which renders the docs at the-guild.dev/graphql/ws:
 *
 * - links lose their `.md` suffix and `/index` ending (`/docs/client/index.md`
 *   becomes `/docs/client`);
 * - each page gets frontmatter with a `title` taken from its first heading
 *   (which is removed, the site renders the title) and the module it belongs
 *   to, a shorter `sidebarTitle`, and a `description` from its first paragraph;
 * - each folder gets a `meta.json` with its sidebar `title` and ordered `pages`.
 *
 * Run through `yarn gendocs`; .github/workflows/docs-regenerate.yaml does the
 * same on every push to master that touches src/.
 */
import fsp from 'fs/promises';
import path from 'path';

const docsDir = path.join('website', 'content', 'docs');
const PACKAGE = 'graphql-ws';

const ROOT_TITLE = 'API Reference';
const ROOT_DESCRIPTION = `Every module, function, class, interface and type exported by ${PACKAGE}, generated from the source.`;
const KIND_PREFIX =
  /^(Class|Enumeration|Function|Interface|Type Alias|Variable): /;
/** Folders typedoc groups symbols by; other folders are module paths. */
const KIND_DIRS = new Set([
  'classes',
  'enumerations',
  'functions',
  'interfaces',
  'type-aliases',
  'variables',
]);
const MAX_DESCRIPTION = 160;

(async function main() {
  await processDir('');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * @param {string} relDir directory relative to the docs root ('' for the root)
 */
async function processDir(relDir) {
  const dirPath = path.join(docsDir, relDir);
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();

  for (const dir of dirs) {
    await processDir(relDir ? `${relDir}/${dir}` : dir);
  }
  for (const file of files) {
    await processFile(relDir, file);
  }

  const dirName = path.basename(relDir);
  const meta = {
    title: !relDir
      ? ROOT_TITLE
      : KIND_DIRS.has(dirName)
        ? humanize(dirName)
        : dirName,
    pages: [
      // A module folder links to its own index page; the root lists it.
      ...(!relDir && files.includes('index.md') ? ['index'] : []),
      ...dirs,
      ...files
        .filter((file) => file !== 'index.md')
        .map((file) => file.slice(0, -3)),
    ],
  };
  await fsp.writeFile(
    path.join(dirPath, 'meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
}

/**
 * @param {string} relDir
 * @param {string} file
 */
async function processFile(relDir, file) {
  const filePath = path.join(docsDir, relDir, file);
  let src = await fsp.readFile(filePath, 'utf8');

  // `](/docs/client/interfaces/Client.md)` -> `](/docs/client/interfaces/Client)`
  src = src.replace(/\]\(([^)\s]+?)\.md(#[^)]*)?\)/g, ']($1$2)');
  // `](/docs/client/index)` -> `](/docs/client)`
  src = src.replace(/\]\(([^)\s]*?)\/index(#[^)]*)?\)/g, ']($1$2)');

  const lines = src.split('\n');
  const headingIndex = lines.findIndex((line) => line.startsWith('# '));
  const heading =
    headingIndex === -1
      ? ''
      : unescape(lines[headingIndex]?.slice(2).trim() ?? '');
  if (headingIndex !== -1) {
    lines.splice(headingIndex, 1);
  }
  const body = lines.join('\n').replace(/^\n+/, '');

  const isIndex = file === 'index.md';
  // `use/bun/interfaces` -> `use/bun`; a module index is in its module folder.
  const module = isIndex
    ? relDir
    : KIND_DIRS.has(path.basename(relDir))
      ? path.dirname(relDir)
      : relDir;

  let title;
  let sidebarTitle;
  let description;
  if (isIndex && !relDir) {
    title = ROOT_TITLE;
    sidebarTitle = 'Overview';
    description = ROOT_DESCRIPTION;
  } else if (isIndex) {
    title = `Module: ${module}`;
    sidebarTitle = module;
    description = `Everything exported by ${PACKAGE}/${module}: functions, classes, interfaces and types, with links to each.`;
  } else {
    // Several modules export a `makeHandler` or an `Extra`; the module
    // keeps titles and descriptions distinct.
    title = `${heading || path.basename(file, '.md')} (${module})`;
    // `Interface: ClientOptions<P> (client)` -> `ClientOptions`
    sidebarTitle = (heading || path.basename(file, '.md'))
      .replace(KIND_PREFIX, '')
      .replace(/\(\)$/, '')
      .replace(/<.*>$/, '');
    const paragraph = firstParagraph(body);
    description = paragraph
      ? truncate(`${sidebarTitle} (${PACKAGE}/${module}): ${paragraph}`)
      : `${sidebarTitle}, exported by ${PACKAGE}/${module}.`;
  }

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    ...(sidebarTitle !== title
      ? [`sidebarTitle: ${JSON.stringify(sidebarTitle)}`]
      : []),
    `description: ${JSON.stringify(description)}`,
    '---',
    '',
  ].join('\n');

  await fsp.writeFile(filePath, frontmatter + body);
}

/**
 * The first prose paragraph of a page, as a plain sentence for the meta
 * description; undefined when the page has none.
 *
 * @param {string} body
 */
function firstParagraph(body) {
  for (const line of body.split('\n')) {
    const text = line.trim();
    if (
      !text ||
      /^([#>|*\-`]|Defined in|\d+\.)/.test(text) ||
      text.startsWith('•') ||
      text.startsWith('[')
    ) {
      continue;
    }
    const plain = unescape(text)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .trim();
    if (plain.length < 20) {
      continue;
    }
    return plain;
  }
  return undefined;
}

/**
 * @param {string} text
 */
function truncate(text) {
  return text.length > MAX_DESCRIPTION
    ? text.slice(0, MAX_DESCRIPTION - 3).trimEnd() + '...'
    : text;
}

/**
 * Drops the markdown escapes typedoc-plugin-markdown adds (`\_`, `\<`, ...).
 *
 * @param {string} text
 */
function unescape(text) {
  return text.replace(/\\(.)/g, '$1');
}

/**
 * `type-aliases` -> `Type Aliases`
 *
 * @param {string} name
 */
function humanize(name) {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
