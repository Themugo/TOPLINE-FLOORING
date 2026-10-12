import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Render smoke tests only (npm run test:smoke). Kept separate from vite.config.ts so the production build is untouched.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(process.cwd(), './src') } },
  test: {
    environment: 'jsdom',
    include: ['tests/smoke/**/*.test.tsx'],
    setupFiles: ['tests/smoke/setup.ts'],
    css: false,
    testTimeout: 20000,
  },
});
