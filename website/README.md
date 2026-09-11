# GraphQL over WebSocket docs

The documentation at [the-guild.dev/graphql/ws](https://the-guild.dev/graphql/ws) is
authored here and rendered by [the-guild-org/website](https://github.com/the-guild-org/website),
which fetches this folder at build time. Nothing in this folder is built or deployed on its own.

## Layout

| Path              | What it is                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `content/guides/` | The hand-written pages (Get Started, Recipes). Folder order and titles come from the folder's `meta.json`.            |
| `content/docs/`   | The API reference, generated from `src/` by `yarn gendocs` (typedoc, see `typedoc.js` and `scripts/post-gendocs.js`). |
| `assets/`         | Images referenced from pages as `/assets/...`.                                                                        |

The `/changelog` page is rendered from `CHANGELOG.md`; nothing to maintain here.

## The API reference

`content/docs/` is generated, do not edit it by hand. It is committed so that the website can fetch
it like any other page; `.github/workflows/docs-regenerate.yaml` regenerates and commits it on every
push to `master` that touches `src/`, so contributors need not run the generator. To preview API
changes locally, or to include them in a pull request, run `yarn gendocs`.

## Writing pages

- Frontmatter: `title` (required) and `description`. The site renders the title as the page
  heading, so pages do not start with an `# H1`. Use `sidebarTitle` when the sidebar should show a
  shorter label.
- Ordering: each folder's `meta.json` lists `pages` in display order; a folder's `title` is its
  sidebar label. Pages not listed are built but hidden from the sidebar.
- Components available without importing: `Callout`, `Tabs` / `Tabs.Tab`, `Cards`, `FileTree`. Name
  code blocks with ` ```ts title="example.ts" `, and use ` ```sh npm2yarn ` for install commands.
- Links between pages are root-relative to this product: `/guides/recipes`, `/docs/client`.

## Previewing changes

Every same-repository pull request that touches this folder gets a preview at
`https://ws-pr-<number>.guild-dev-website.pages.dev/graphql/ws` (linked in a PR comment
within about ten minutes). Merges to `master` redeploy the live docs automatically.
