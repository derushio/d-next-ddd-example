import 'reflect-metadata';
import '@testing-library/jest-dom';

// DI Container のテスト用設定
import { container } from 'tsyringe';
import { beforeEach } from 'vitest';

// fail 関数をグローバルに定義（存在しない場合のみ）
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalオブジェクトへの動的プロパティ追加のためanyが必要
if (typeof (global as any).fail === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globalオブジェクトへの動的プロパティ追加のためanyが必要
  (global as any).fail = (message?: string): never => {
    throw new Error(message || 'Test failed');
  };
}

// テスト前にコンテナをクリア
beforeEach(() => {
  container.clearInstances();
});
