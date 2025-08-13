'use client';

import { useLayout } from '@/components/providers/LayoutProvider';
import { Button } from '@/components/ui/Button';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';

import { clsx } from 'clsx';
import { memo, ReactNode } from 'react';
import { HiBars3, HiSparkles } from 'react-icons/hi2';

/**
 * モダンなヘッダーコンポーネント
 *
 * 軽微な状態管理最適化:
 * - 新しいLayoutProviderとuseLayoutフック使用
 * - memo最適化による再レンダリング防止
 * - Context分離による責務明確化
 *
 * 改善点：
 * - グラデーション背景とガラスモーフィズム効果
 * - アニメーション効果
 * - カスタムButtonコンポーネント使用
 * - より良いレスポンシブ対応
 */
export const HeaderClient = memo(function HeaderClient({
  UserEmail,
}: {
  UserEmail: ReactNode;
}) {
  const { isMounted } = useIsMountedCheck();
  const { isSidenavOpen, setIsSidenavOpen, isSidenavHide, setIsSidenavHide } =
    useLayout();

  return (
    <header className={clsx('fixed top-0 left-0 right-0 z-40 h-14 w-full')}>
      {/* 🌟 Aurora グラデーション背景 */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 backdrop-blur-md',
        )}
      />

      {/* 💎 ガラスモーフィズム効果 */}
      <div className={clsx('absolute inset-0 bg-white/10 backdrop-blur-sm')} />

      {/* メインコンテンツ */}
      <div className={clsx('relative h-full px-4 sm:px-6 lg:px-8')}>
        <div className={clsx('flex h-full items-center justify-between')}>
          {/* ハンバーガーメニューボタン - モバイル時常に表示 */}
          <div className={clsx('flex items-center')}>
            <div className={clsx('block sm:hidden')}>
              {isMounted && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsSidenavOpen(!isSidenavOpen)}
                  className={clsx(
                    'text-white hover:bg-white/20 p-2 transition-all duration-200 group',
                  )}
                  aria-label={
                    isSidenavOpen ? 'サイドナビを閉じる' : 'サイドナビを開く'
                  }
                >
                  <HiBars3
                    className={clsx(
                      'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                      isSidenavOpen ? 'rotate-90' : 'rotate-0',
                    )}
                  />
                </Button>
              )}
            </div>

            {/* デスクトップ時のサイドナビ切り替えボタン */}
            <div className={clsx('hidden sm:block')}>
              {isMounted && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsSidenavHide(!isSidenavHide)}
                  className={clsx(
                    'text-white hover:bg-white/20 p-2 transition-all duration-200 group',
                  )}
                  aria-label={
                    isSidenavHide ? 'サイドナビを表示' : 'サイドナビを非表示'
                  }
                >
                  <HiBars3
                    className={clsx(
                      'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                      isSidenavHide ? 'rotate-0' : 'rotate-90',
                    )}
                  />
                </Button>
              )}
            </div>

            {/* ブランドロゴ/タイトル */}
            <div className={clsx('ml-4 flex items-center space-x-2')}>
              <div
                className={clsx(
                  'w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all duration-200',
                )}
              >
                <HiSparkles
                  className={clsx('w-5 h-5 text-white animate-pulse')}
                />
              </div>
              <h1
                className={clsx(
                  'hidden sm:block text-lg font-bold text-white tracking-wide',
                )}
              >
                Next App
              </h1>
            </div>
          </div>

          {/* 右側: ユーザー情報 */}
          <div className={clsx('flex items-center space-x-4')}>{UserEmail}</div>
        </div>
      </div>

      {/* ✨ ボトムボーダー */}
      <div
        className={clsx(
          'absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent',
        )}
      />
    </header>
  );
});
