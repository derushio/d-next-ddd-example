import type { User } from '@/layers/domain/entities/User';

/**
 * User エンティティ → DTO 変換マッパー
 *
 * DRY原則:
 * - 全 UseCase のインラインマッピングを一元管理
 * - フィールドの追加・変更が1箇所で完結する
 *
 * 使用例:
 * ```ts
 * return ok(toUserResponseDTO(user));
 * ```
 */
export function toUserResponseDTO(user: User) {
  return {
    id: user.id.value,
    name: user.name,
    email: user.email.value,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
