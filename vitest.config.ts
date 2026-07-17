import { defineConfig } from 'vitest/config';
// Use the SWC React plugin (the one actually in devDependencies + used by vite.config.ts);
// the old `@vitejs/plugin-react` import was not installed and broke every test run.
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Node 26 exposes a process-wide localStorage accessor that shadows the
    // browser storage supplied by JSDOM unless a persistence file is set.
    // Browser tests must use JSDOM's isolated storage, so disable Node's
    // experimental process storage in Vitest workers.
    poolOptions: {
      forks: {
        execArgv: ['--no-experimental-webstorage'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
