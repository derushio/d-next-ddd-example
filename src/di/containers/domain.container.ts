import 'reflect-metadata';

import { infrastructureContainer } from '@/di/containers/infrastructure.container';
import { safeRegister } from '@/di/containers/safeRegister';
import { INJECTION_TOKENS } from '@/di/tokens';
import { UserDomainService } from '@/layers/domain/services/UserDomainService';

/**
 * Domain Container - ドメイン層
 *
 * Infrastructure層の上に構築され、ビジネスロジックを管理：
 * - UserDomainService: ユーザーに関するビジネスルール
 * - その他のドメインサービス（将来追加予定）
 */
export const domainContainer = infrastructureContainer.createChildContainer();

// Domain Service registrations
safeRegister(
  domainContainer,
  INJECTION_TOKENS.UserDomainService,
  UserDomainService,
);

// NOTE: DIコンテナ初期化ログは console.log を使用する。
// Logger は infrastructureContainer で登録されており、その子コンテナ（domainContainer）の
// 初期化ログを出力する時点では resolve() 経由でアクセス可能だが、
// コンテナ初期化コード全体の一貫性・シンプルさのため console.log を使用する。
// （infrastructureContainer や applicationContainer の初期化時点では Logger 未登録であり、
//   全コンテナで統一的に console.log を使用することで混乱を防ぐ）
console.log('✅ Domain Container初期化完了');
