import { SidenavClient } from '@/components/layout/sidebar/SidenavClient';
import { SidenavClientContainer } from '@/components/layout/sidebar/SidenavClientContainer';
import { resolve } from '@/di/resolver';
import { getCurrentUserCached } from '@/utils/auth/getCurrentUserCached';
import { toErrorMeta } from '@/utils/toErrorMeta';

/**
 * サイドナビゲーション
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseを使用してユーザー情報取得
 * - ドーナツ構造：認証情報はServer Componentで取得、UI操作はClient Component
 */
export async function Sidenav() {
  const logger = resolve('Logger');
  try {
    const result = await getCurrentUserCached();

    // 型を合わせるための変換（SidenavClientが既存のSession型を期待している場合）
    const authData = result.isOk()
      ? {
          user: {
            id: result.value.id,
            email: result.value.email,
            name: result.value.name,
          },
        }
      : null;

    return (
      <SidenavClientContainer>
        <SidenavClient auth={authData} />
      </SidenavClientContainer>
    );
  } catch (error) {
    logger.error('Failed to load sidebar auth', toErrorMeta(error));
    // エラー時は未認証として扱う
    return (
      <SidenavClientContainer>
        <SidenavClient auth={null} />
      </SidenavClientContainer>
    );
  }
}
