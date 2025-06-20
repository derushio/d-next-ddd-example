import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**/*'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@prisma/generated': path.resolve(__dirname, './src/layers/infrastructure/persistence/prisma/generated'),
      '@tests': path.resolve(__dirname, './tests'),
      '@/components/ui': path.resolve(__dirname, './src/components/ui-shadcn'),
      '@/components/ui-shadcn': path.resolve(__dirname, './src/components/ui-shadcn'),
      '@/components/ui-legacy': path.resolve(__dirname, './src/components/ui-legacy'),
      '@/lib/utils-shadcn': path.resolve(__dirname, './src/lib/utils-shadcn'),
    },
  },
});
