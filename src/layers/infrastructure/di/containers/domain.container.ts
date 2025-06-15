import 'reflect-metadata';

import { UserDomainService } from '@/layers/domain/services/UserDomainService';
import { infrastructureContainer } from '@/layers/infrastructure/di/containers/infrastructure.container';
import { INJECTION_TOKENS } from '@/layers/infrastructure/di/tokens';

/**
 * Domain Container - ドメイン層
 *
 * Infrastructure層の上に構築され、ビジネスロジックを管理：
 * - UserDomainService: ユーザーに関するビジネスルール
 * - その他のドメインサービス（将来追加予定）
 */
export const domainContainer = infrastructureContainer.createChildContainer();

// Prevent duplicate registration
function safeRegister<T>(token: symbol, creator: new (...args: any[]) => T) {
  if (!domainContainer.isRegistered(token)) {
    domainContainer.registerSingleton(creator);
    domainContainer.register(token, { useToken: creator });
  }
}

// Domain Service registrations
safeRegister(INJECTION_TOKENS.UserDomainService, UserDomainService);

console.log('✅ Domain Container初期化完了');
