/**
 * 認証ページ用レイアウト
 * サイドバー・認証チェックなし
 * auth ページは独自のフルスクリーンレイアウトを持つため children をそのまま返す
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
