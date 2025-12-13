/**
 * ハッシュ処理サービスのインターフェース
 * Domain層で定義し、Infrastructure層で実装する
 *
 * パスワードハッシュなどドメインロジックで必要なハッシュ処理の抽象化
 */
export interface IHashService {
  /** テキストをハッシュ化する */
  generateHash(text: string): Promise<string>;
  /** ハッシュとプレーンテキストを比較する */
  compareHash(text: string, hash: string): Promise<boolean>;
}
