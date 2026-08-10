'use client';

import type { ReactNode } from 'react';
import { useLayout } from '@/components/providers/LayoutProvider';
import { cn } from '@/lib/utils';

/**
 * サイドバー描画領域
 */
export function SidenavClientContainer({ children }: { children: ReactNode }) {
  const { isSidenavOpen, setIsSidenavOpen } = useLayout();

  return (
    <>
      {/* サイドバー表示時に他の箇所をクリックしたときにサイドバーを閉じるための判定エリア */}
      {/* モバイル時: isSidenavOpenで制御、デスクトップ時: オーバーレイ無し */}
      {isSidenavOpen && (
        <button
          type='button'
          className={cn(
            'fixed top-0 left-0 size-full z-40',
            'block sm:hidden', // モバイル時のみ表示
            'bg-transparent border-none cursor-default',
          )}
          onClick={() => setIsSidenavOpen(false)}
          aria-label='サイドナビを閉じる'
        />
      )}

      {children}
    </>
  );
}
