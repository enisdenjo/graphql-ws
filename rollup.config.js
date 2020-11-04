import { terser } from 'rollup-plugin-terser';

export default {
  input: './lib/esm/client.js',
  output: [
    {
      file: './lib/umd/graphql-ws.js',
      format: 'umd',
      name: 'graphqlWs',
    },
    {
      file: './lib/umd/graphql-ws.min.js',
      format: 'umd',
      name: 'graphqlWs',
      plugins: [terser()],
    },
  ],
};
