import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolução de paths do tsconfig é nativa do Vite agora; o plugin que eu
  // tinha instalado era redundante e foi removido.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    // Só lógica por enquanto: sem jsdom nem Testing Library, que seriam peso
    // morto sem nenhum teste de componente escrito. Entram junto com o primeiro.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
