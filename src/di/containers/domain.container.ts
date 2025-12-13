import 'reflect-metadata';

import { infrastructureContainer } from '@/di/containers/infrastructure.container';
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

// Prevent duplicate registration
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DIコンテナのコンストラクタ型は実行時に多様な引数パターンを受け取るためanyが必要
function safeRegister<T>(token: symbol, creator: new (...args: any[]) => T) {
  if (!domainContainer.isRegistered(token)) {
    domainContainer.registerSingleton(creator);
    domainContainer.register(token, { useToken: creator });
  }
}

// Domain Service registrations
safeRegister(INJECTION_TOKENS.UserDomainService, UserDomainService);

console.log('✅ Domain Container初期化完了');
