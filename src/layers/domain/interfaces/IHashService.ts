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
  /**
   * タイミング攻撃対策用ダミーハッシュを取得
   *
   * ユーザーが存在しない場合でもcompareHashを実行し、
   * レスポンス時間を均一化するために使用します。
   */
  getTimingSafeDummyHash(): string;
}
