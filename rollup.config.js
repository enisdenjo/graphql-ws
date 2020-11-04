import { terser } from 'rollup-plugin-terser';

export default {
  input: './esm/client.js',
  output: [
    {
      file: './umd/graphql-ws.js',
      format: 'umd',
      name: 'graphqlWs',
    },
    {
      file: './umd/graphql-ws.min.js',
      format: 'umd',
      name: 'graphqlWs',
      plugins: [terser()],
    },
  ],
};
