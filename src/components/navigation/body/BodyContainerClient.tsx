'use client';

import { clsx } from 'clsx';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { ToastProvider } from '@/components/providers/ToastProvider';
import {
  LayoutProvider,
  useLayout,
} from '@/components/providers/LayoutProvider';

import { ReactNode, memo } from 'react';

// 後方互換性のためのエイリアス（段階的移行用）
export { LayoutContext as BodyStateContext } from '@/components/providers/LayoutProvider';

/**
 * レイアウトコンテナの内部コンポーネント
 * memo最適化: 不必要な再レンダリングを防止
 */
const BodyContainerInner = memo(function BodyContainerInner({
  children,
}: {
  children: ReactNode;
}) {
  const { isMountedDelay } = useIsMountedCheck();
  const { sidenavMargin } = useLayout();

  return (
    <div
      className={clsx(
        'h-full ml-0',
        isMountedDelay && 'transition-margin',
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
      <ToastProvider>
        <BodyContainerInner>{children}</BodyContainerInner>
      </ToastProvider>
    </LayoutProvider>
  );
}
