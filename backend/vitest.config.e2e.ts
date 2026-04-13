import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
        },
      },
    }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e.spec.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
