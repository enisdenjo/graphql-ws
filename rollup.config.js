import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/client.ts',
  plugins: [typescript()],
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
