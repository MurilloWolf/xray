import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/e2e/**/*.test.ts?(x)'],
    setupFiles: ['./tests/e2e/setup.ts'],
  },
});
