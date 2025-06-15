import 'reflect-metadata';

import '@testing-library/jest-dom';
// DI Container のテスト用設定
import { container } from 'tsyringe';
import { beforeEach } from 'vitest';

// テスト前にコンテナをクリア
beforeEach(() => {
  container.clearInstances();
});
