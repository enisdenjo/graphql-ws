# Notes about dependency patches in [package.json](/package.json)

Here we collect reasons and write explanations about why some resolutions or patches have been added.

### pkgroll

1. Skip libchecking while generating type declarations because we never bundle `@types` by disabling `respectExternal` ([read more](https://github.com/Swatinem/rollup-plugin-dts?tab=readme-ov-file#what-to-expect)). The dependencies from `use/*` are optional and should not be bundled - but pkgroll attempts to.
