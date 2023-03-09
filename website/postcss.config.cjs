// @ts-expect-error module does exist
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('@theguild/tailwind-config/postcss.config');
module.exports = config;
