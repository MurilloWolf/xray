import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@xray-analytics/analytics-react': path.resolve(
        __dirname,
        '../../packages/analytics-react/src/index.tsx',
      ),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
});
