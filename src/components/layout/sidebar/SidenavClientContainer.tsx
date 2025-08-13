'use client';

import { BodyStateContext } from '@/components/layout/container/BodyContainerClient';

import { clsx } from 'clsx';
import { ReactNode, useContext } from 'react';

/**
 * サイドバー描画領域
 */
export function SidenavClientContainer({ children }: { children: ReactNode }) {
  const { isSidenavOpen, setIsSidenavOpen, isSidenavHide } =
    useContext(BodyStateContext);

  return (
    <>
      {/* サイドバー表示時に他の箇所をクリックしたときにサイドバーを閉じるための判定エリア */}
      {/* モバイル時: isSidenavOpenで制御、デスクトップ時: オーバーレイ無し */}
      {isSidenavOpen && (
        <div
          className={clsx(
            'fixed top-0 left-0 h-full w-full z-40',
            'block sm:hidden', // モバイル時のみ表示
          )}
          onClick={() => setIsSidenavOpen(false)}
          aria-label='サイドナビを閉じる'
        />
      )}

      {children}
    </>
  );
}
