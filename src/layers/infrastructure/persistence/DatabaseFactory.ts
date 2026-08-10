import { getPrismaClient } from '@/layers/infrastructure/persistence/prisma';
import type { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

/**
 * データベースクライアントファクトリー
 * prisma.ts のglobalThisシングルトンインスタンスをデフォルトで返す
 * テスト時のみ setInstance() でモック差し替え可能
 */
let _testInstance: PrismaClient | null = null;

export function getInstance(): PrismaClient {
  return _testInstance ?? getPrismaClient();
}

export function setInstance(instance: PrismaClient): void {
  _testInstance = instance;
}

export function resetInstance(): void {
  _testInstance = null;
}
