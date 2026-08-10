import {
  createEntityIdClass,
  generateCuid2,
} from '@/layers/domain/value-objects/EntityId';

/**
 * セッションID Value Object
 *
 * ユーザーセッションを一意に識別するためのID。
 * CUID2形式（小文字英数字、7-32文字）を使用。
 *
 * createEntityIdClass ファクトリにより、エラーコード・メッセージを宣言的に定義。
 */
export class SessionId extends createEntityIdClass({
  emptyErrorCode: 'SESSION_ID_REQUIRED',
  invalidFormatErrorCode: 'INVALID_SESSION_ID_FORMAT',
  emptyMessage: 'セッションIDは必須です',
  invalidFormatMessage: 'セッションIDの形式が正しくありません',
}) {}

export const generateSessionId = (): SessionId => {
  return new SessionId(generateCuid2());
};
