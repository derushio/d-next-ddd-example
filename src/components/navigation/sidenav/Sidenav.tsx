'use server';

import { SidenavClient } from '@/components/navigation/sidenav/SidenavClient';
import { SidenavClientContainer } from '@/components/navigation/sidenav/SidenavClientContainer';
import { resolve } from '@/layers/infrastructure/di/resolver';

/**
 * サイドナビゲーション
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseを使用してユーザー情報取得
 * - ドーナツ構造：認証情報はServer Componentで取得、UI操作はClient Component
 */
export async function Sidenav() {
  try {
    const getCurrentUserUseCase = resolve('GetCurrentUserUseCase');
    const user = await getCurrentUserUseCase.execute();

    // 型を合わせるための変換（SidenavClientが既存のSession型を期待している場合）
    const authData = user
      ? {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          expires: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30日後
        }
      : null;

    return (
      <SidenavClientContainer>
        <SidenavClient auth={authData} />
      </SidenavClientContainer>
    );
  } catch (error) {
    // エラー時は未認証として扱う
    return (
      <SidenavClientContainer>
        <SidenavClient auth={null} />
      </SidenavClientContainer>
    );
  }
}
