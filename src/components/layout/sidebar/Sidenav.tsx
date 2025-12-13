'use server';

import { SidenavClient } from '@/components/layout/sidebar/SidenavClient';
import { SidenavClientContainer } from '@/components/layout/sidebar/SidenavClientContainer';
import { resolve } from '@/di/resolver';
import { isSuccess } from '@/layers/application/types/Result';

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
    const result = await getCurrentUserUseCase.execute();

    // 型を合わせるための変換（SidenavClientが既存のSession型を期待している場合）
    const authData = isSuccess(result)
      ? {
          user: {
            id: result.data.id,
            email: result.data.email,
            name: result.data.name,
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
