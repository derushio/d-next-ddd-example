import { DomainError } from '@/layers/domain/errors/DomainError';
import { Prisma } from '@/layers/infrastructure/persistence/prisma/generated';

/**
 * Prisma既知エラーをDomainErrorに変換する共通ヘルパー
 *
 * DRY原則:
 * - PrismaUserRepository / PrismaSessionRepository の重複コードを一元管理
 * - P2002（unique constraint）、P2025（record not found）を DomainError にマッピング
 *
 * 使用例:
 * ```ts
 * } catch (error) {
 *   mapPrismaError(error, {
 *     p2002Email: 'メールアドレスが既に使用されています',
 *     p2025: '更新対象のユーザーが見つかりません',
 *   });
 *   throw new DomainError('ユーザーの更新に失敗しました', 'USER_UPDATE_FAILED');
 * }
 * ```
 */
export interface PrismaErrorMappings {
  /** P2002: unique constraint 違反（emailフィールド対象） */
  p2002Email?: string;
  /** P2002: unique constraint 違反（emailフィールド以外のカスタムエラー） */
  p2002Custom?: (target: string[]) => DomainError | null;
  /** P2003: foreign key constraint 違反（汎用メッセージ） */
  p2003?: string;
  /** P2003: foreign key constraint 違反（カスタムエラー） */
  p2003Custom?: () => DomainError | null;
  /** P2025: record not found */
  p2025?: string;
}

/**
 * Prismaエラーコードに基づいてDomainErrorをスローする。
 * 対応するマッピングがない場合はスローせずに終了（呼び出し元でフォールバックエラーをスロー）。
 *
 * @param error エラーオブジェクト
 * @param mappings エラーコードとメッセージのマッピング
 */
export function mapPrismaError(
  error: unknown,
  mappings: PrismaErrorMappings,
): void {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return;

  if (error.code === 'P2002' && (mappings.p2002Email || mappings.p2002Custom)) {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[])
      : [];
    if (target.includes('email') && mappings.p2002Email) {
      throw new DomainError(mappings.p2002Email, 'EMAIL_DUPLICATE');
    }
    if (mappings.p2002Custom) {
      const customError = mappings.p2002Custom(target);
      if (customError) throw customError;
    }
  }

  if (error.code === 'P2003') {
    if (mappings.p2003Custom) {
      const customError = mappings.p2003Custom();
      if (customError) throw customError;
    } else if (mappings.p2003) {
      throw new DomainError(mappings.p2003, 'FOREIGN_KEY_VIOLATION');
    }
  }

  if (error.code === 'P2025' && mappings.p2025) {
    throw new DomainError(mappings.p2025, 'RECORD_NOT_FOUND');
  }
}
