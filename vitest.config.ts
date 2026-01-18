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
      '@prisma/generated': path.resolve(
        __dirname,
        './src/layers/infrastructure/persistence/prisma/generated',
      ),
      '@tests': path.resolve(__dirname, './tests'),
      // shadcn/ui コンポーネントは src/components/ui に配置
      '@/components/ui': path.resolve(__dirname, './src/components/ui'),
      '@/lib/utils-shadcn': path.resolve(__dirname, './src/lib/utils-shadcn'),
    },
  },
});
