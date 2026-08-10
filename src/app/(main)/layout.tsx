import { BodyContainer } from '@/components/layout/container/BodyContainer';
import { BodyContainerClient } from '@/components/layout/container/BodyContainerClient';

/**
 * サイドバー付きメインレイアウト
 * auth ページ以外の全ページで適用される
 * Server Component
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BodyContainerClient>
      <BodyContainer>{children}</BodyContainer>
    </BodyContainerClient>
  );
}
