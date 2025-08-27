'use client';

import { NavigationItem } from '@/components/features/navigation/NavigationItem';
import { useLayout } from '@/components/providers/LayoutProvider';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';

import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import {
  HiArrowLeftOnRectangle,
  HiArrowRightOnRectangle,
  HiHome,
  HiSparkles,
  HiUser,
  HiUserPlus,
  HiUsers,
} from 'react-icons/hi2';

/**
 * モダンなサイドナビゲーションコンポーネント
 *
 * 軽微な状態管理最適化:
 * - 新しいLayoutProviderとuseLayoutフック使用
 * - memo最適化による再レンダリング防止
 * - Context分離による責務明確化
 *
 * 改善点：
 * - カスタムデザインでガラスモーフィズム効果
 * - グラデーション背景
 * - アニメーション効果
 * - アクティブ状態の視覚的フィードバック
 * - レスポンシブ対応
 */
export const SidenavClient = memo(function SidenavClient({
  auth,
}: {
  auth: Awaited<ReturnType<typeof getAuth>>;
}) {
  const { isMounted, isMountedDelay } = useIsMountedCheck();
  const { isSidenavOpen, isSidenavHide } = useLayout();
  const pathname = usePathname();

  // レスポンシブ表示制御を明確に分離
  const isVisibleMobile = isSidenavOpen; // モバイル時はisSidenavOpenのみで制御

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 z-50 w-72 h-screen',
        'transform transition-all duration-300 ease-in-out',
        isMountedDelay && 'transition-transform',
        // モバイル時の表示制御
        isVisibleMobile ? 'translate-x-0' : '-translate-x-full',
        // デスクトップ時の表示制御
        'sm:translate-x-0',
        isSidenavHide && 'sm:-translate-x-full',
      )}
    >
      {/* 🌟 Aurora グラデーション背景 */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50',
        )}
      />
      <div className={clsx('absolute inset-0 bg-white/80 backdrop-blur-xl')} />

      {/* ✨ ボーダー */}
      <div
        className={clsx(
          'absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-gray-200 to-transparent',
        )}
      />

      {/* メインコンテンツ */}
      <div className={clsx('relative h-full flex flex-col')}>
        {/* 🌟 ヘッダー */}
        <div
          className={clsx(
            'flex-shrink-0 px-4 py-6 border-b border-gray-100/50',
          )}
        >
          <div className={clsx('flex items-center space-x-3')}>
            <div
              className={clsx(
                'w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300',
              )}
            >
              <HiSparkles
                className={clsx('w-6 h-6 text-white animate-pulse')}
              />
            </div>
            <div>
              <h1
                className={clsx(
                  'text-lg font-bold text-gray-900 tracking-tight',
                )}
              >
                Next App
              </h1>
              <p className={clsx('text-xs text-gray-500 mt-0.5')}>
                Modern Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className={clsx('flex-1 px-3 py-6 space-y-2 overflow-y-auto')}>
          {/* メインナビゲーション */}
          <div className={clsx('space-y-1')}>
            <div className={clsx('px-3 mb-4')}>
              <h2
                className={clsx(
                  'text-xs font-semibold text-gray-400 uppercase tracking-wider',
                )}
              >
                メインメニュー
              </h2>
            </div>

            <NavigationItem
              href='/'
              icon={<HiHome />}
              isActive={pathname === '/'}
            >
              ホーム
            </NavigationItem>
          </div>

          {/* 管理機能メニュー */}
          {isMounted && auth && (
            <div className={clsx('space-y-1 pt-6')}>
              <div className={clsx('px-3 mb-4')}>
                <h2
                  className={clsx(
                    'text-xs font-semibold text-gray-400 uppercase tracking-wider',
                  )}
                >
                  管理機能
                </h2>
              </div>

              <NavigationItem
                href='/users'
                icon={<HiUsers />}
                isActive={pathname.startsWith('/users')}
              >
                ユーザー管理
              </NavigationItem>

              <NavigationItem
                href='/users/new'
                icon={<HiUserPlus />}
                isActive={pathname === '/users/new'}
              >
                新規ユーザー
              </NavigationItem>
            </div>
          )}
        </nav>

        {/* 🌟 フッター: 認証関連 */}
        <div
          className={clsx(
            'flex-shrink-0 px-4 py-4 border-t border-gray-100/50',
          )}
        >
          {isMounted && !auth && (
            <NavigationItem
              href='/api/auth/signin?callbackUrl=/'
              icon={<HiArrowRightOnRectangle />}
              variant='auth'
            >
              サインイン
            </NavigationItem>
          )}

          {isMounted && auth && (
            <div className={clsx('space-y-3')}>
              {/* 🌟 ユーザー情報 */}
              <div
                className={clsx(
                  'px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-cyan-50 border border-violet-200/50 hover:shadow-lg transition-all duration-300',
                )}
              >
                <div className={clsx('flex items-center space-x-3')}>
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center hover:scale-110 transition-transform duration-300',
                    )}
                  >
                    <HiUser className={clsx('w-4 h-4 text-white')} />
                  </div>
                  <div className={clsx('flex-1 min-w-0')}>
                    <p
                      className={clsx(
                        'text-sm font-medium text-gray-900 truncate',
                      )}
                    >
                      {auth.user?.name || 'ユーザー'}
                    </p>
                    <p className={clsx('text-xs text-gray-500 truncate')}>
                      {auth.user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* サインアウトボタン */}
              <NavigationItem
                href='/api/auth/signout?callbackUrl=/'
                icon={<HiArrowLeftOnRectangle />}
                variant='danger'
              >
                サインアウト
              </NavigationItem>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
