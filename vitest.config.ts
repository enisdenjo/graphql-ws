import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    poolOptions: {
      // gc() for the memory tests
      forks: { execArgv: ['--expose-gc'] },
    },
  },
});
