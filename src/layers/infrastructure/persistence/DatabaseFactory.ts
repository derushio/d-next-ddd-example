import { PrismaClient } from '@/layers/infrastructure/persistence/prisma/generated';

/**
 * データベースクライアントファクトリー
 * クリーンアーキテクチャの一歩として、PrismaClientの生成を集約
 */
export class DatabaseFactory {
  private static instance: PrismaClient | null = null;

  /**
   * シングルトンPrismaClientを取得
   * テスト環境ではモック化可能
   */
  static getInstance(): PrismaClient {
    if (!DatabaseFactory.instance) {
      DatabaseFactory.instance = new PrismaClient();
    }
    return DatabaseFactory.instance;
  }

  /**
   * テスト用のインスタンス設定
   * モック化が必要な場合に使用
   */
  static setInstance(instance: PrismaClient): void {
    DatabaseFactory.instance = instance;
  }

  /**
   * インスタンスをリセット
   * テスト間のクリーンアップに使用
   */
  static resetInstance(): void {
    if (DatabaseFactory.instance) {
      DatabaseFactory.instance.$disconnect();
      DatabaseFactory.instance = null;
    }
  }
}
