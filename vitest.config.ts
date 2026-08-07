import { defineConfig } from 'vitest/config';

// Config separada de vite.config.ts a propósito: la del build carga VitePWA y
// tailwind, que no aportan nada a los tests y ralentizan cada corrida.
// La lógica bajo test (albumStateUtils, helpers puros de orderService) no toca
// React ni el DOM, así que basta el entorno `node`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
