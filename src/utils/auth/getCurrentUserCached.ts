import 'server-only';
import { cache } from 'react';

import { resolve } from '@/di/resolver';

// 同一リクエスト内で複数の Server Component (例: layout の Sidenav と page の guardAuth)
// から呼ばれても、React.cache により 1 リクエスト 1 回に重複排除される。
// dev サーバー長時間稼働時の DB 往復・Logger child 生成・DI resolve 連鎖を削減し、
// HMR 起因の module retention と相まって悪化していた CPU creep を緩和する。

export const getCurrentUserCached = cache(async () => {
  const usecase = resolve('GetCurrentUserUseCase');
  return usecase.execute();
});

export const requireAuthenticationCached = cache(async () => {
  const usecase = resolve('GetCurrentUserUseCase');
  return usecase.requireAuthentication();
});
