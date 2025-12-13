/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import 'vitest';

// よく使われるテスト型定義
declare global {
  // Logger mock calls type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ログメタデータの型は実行時まで不明なためanyが必要
  type LoggerMockCall = [message: string, meta?: any];

  // Vitest fail function
  function fail(message?: string): never;
}
