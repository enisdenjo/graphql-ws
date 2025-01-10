import terser from '@rollup/plugin-terser';

export default {
  input: './dist/client.js',
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
