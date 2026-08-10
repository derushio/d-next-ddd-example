import 'reflect-metadata';
import '@testing-library/jest-dom';

import { faker } from '@faker-js/faker';
// DI Container のテスト用設定
import { container } from 'tsyringe';
import { beforeEach } from 'vitest';

// テスト前にコンテナをクリア・fakerシードをリセット（再現性確保）
beforeEach(() => {
  container.clearInstances();
  faker.seed(12345);
});
