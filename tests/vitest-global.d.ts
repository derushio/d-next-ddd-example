/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import 'vitest';

// よく使われるテスト型定義
declare global {
  // Logger mock calls type
  type LoggerMockCall = [message: string, meta?: any];
  
  // Vitest fail function
  function fail(message?: string): never;
}