'use client';

import { memo, type ReactNode } from 'react';
import {
  LayoutProvider,
  useLayout,
} from '@/components/providers/LayoutProvider';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { cn } from '@/lib/utils';

/**
 * レイアウトコンテナの内部コンポーネント
 * memo最適化: 不必要な再レンダリングを防止
 */
// React Compiler: removable when adopted
const BodyContainerInner = memo(function BodyContainerInner({
  children,
}: {
  children: ReactNode;
}) {
  const { isMountedDelay } = useIsMountedCheck();
  const { sidenavMargin } = useLayout();

  return (
    <div
      className={cn(
        'h-full',
        // モバイル時はマージンなし、デスクトップ時のみマージン適用
        'ml-0',
        isMountedDelay && 'transition-[margin]',
        sidenavMargin,
      )}
    >
      {children}
    </div>
  );
});

/**
 * 軽微な状態管理最適化済みのBodyContainerClient
 *
 * 改善点:
 * - Context分離: Toast と Layout を独立したProviderに分離
 * - useReducer部分導入: Layout状態の統一管理
 * - memo最適化: 不必要な再レンダリングの防止
 * - 責務の明確化: 各Providerが単一責任を持つ
 */
export function BodyContainerClient({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <BodyContainerInner>{children}</BodyContainerInner>
    </LayoutProvider>
  );
}
