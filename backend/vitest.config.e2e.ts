import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

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
  resolve: {
    alias: {
      '@/app.module': resolve(__dirname, 'src/app.module.ts'),
      // Com a barra de propósito: '@' sozinho capturaria '@nestjs/...' também.
      '@/': resolve(__dirname, 'src') + '/',
    },
  },
  test: {
    globals: true,
    // Definido aqui, e não no setup-e2e, porque ConfigModule.forRoot() lê o
    // .env quando o app.module é IMPORTADO — antes de qualquer beforeAll. Uma
    // atribuição a process.env depois disso chega tarde e não tem efeito: o
    // .env local aponta para google-drive e os testes passavam a depender de
    // credencial do Google que não existe.
    env: {
      STORAGE_ADAPTER: 'local',
      CALENDAR_ADAPTER: 'mock',
    },
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
