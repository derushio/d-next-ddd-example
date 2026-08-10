'use client';

import {
  Home,
  LogIn,
  LogOut,
  Sparkles,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import { NavigationItem } from '@/components/features/navigation/NavigationItem';
import { useLayout } from '@/components/providers/LayoutProvider';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

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
// React Compiler: removable when adopted
export const SidenavClient = memo(function SidenavClient({
  auth,
}: {
  auth: { user: { id: string; email: string; name: string } } | null;
}) {
  const { isMounted, isMountedDelay } = useIsMountedCheck();
  const { isSidenavOpen, isSidenavHide } = useLayout();
  const pathname = usePathname();

  // レスポンシブ表示制御を明確に分離
  const isVisibleMobile = isSidenavOpen; // モバイル時はisSidenavOpenのみで制御

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 w-72 h-screen will-change-transform',
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
      <div className='absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50' />
      <div className='absolute inset-0 bg-white/80 backdrop-blur-md' />

      {/* ✨ ボーダー */}
      <div className='absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-border to-transparent' />

      {/* メインコンテンツ */}
      <div className='relative h-full flex flex-col'>
        {/* 🌟 ヘッダー */}
        <div className='flex-shrink-0 px-4 py-6 border-b border-border/50'>
          <div className='flex items-center space-x-3'>
            <div className='size-10 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300'>
              <Sparkles className='size-6 text-white' />
            </div>
            <div>
              <h1 className='text-lg font-bold text-foreground tracking-tight text-balance'>
                Next App
              </h1>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Modern Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className='flex-1 px-3 py-6 space-y-2 overflow-y-auto'>
          {/* メインナビゲーション */}
          <div className='space-y-1'>
            <div className='px-3 mb-4'>
              <h2 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                メインメニュー
              </h2>
            </div>

            <NavigationItem
              href={routes.home}
              icon={<Home />}
              isActive={pathname === '/'}
            >
              ホーム
            </NavigationItem>
          </div>

          {/* 管理機能メニュー */}
          {isMounted && auth && (
            <div className='space-y-1 pt-6'>
              <div className='px-3 mb-4'>
                <h2 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  管理機能
                </h2>
              </div>

              <NavigationItem
                href={routes.users.list()}
                icon={<Users />}
                isActive={pathname.startsWith('/users')}
              >
                ユーザー管理
              </NavigationItem>

              <NavigationItem
                href={routes.users.new}
                icon={<UserPlus />}
                isActive={pathname === '/users/new'}
              >
                新規ユーザー
              </NavigationItem>
            </div>
          )}
        </nav>

        {/* 🌟 フッター: 認証関連 */}
        <div className='flex-shrink-0 p-4 border-t border-border/50'>
          {isMounted && !auth && (
            <NavigationItem
              href={routes.auth.apiSignIn()}
              icon={<LogIn />}
              variant='auth'
            >
              サインイン
            </NavigationItem>
          )}

          {isMounted && auth && (
            <div className='space-y-3'>
              {/* 🌟 ユーザー情報 */}
              <div className='px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-cyan-50 border border-violet-200/50 hover:shadow-lg transition-all duration-300'>
                <div className='flex items-center space-x-3'>
                  <div className='size-8 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center hover:scale-110 transition-transform duration-300'>
                    <User className='size-4 text-white' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-foreground truncate'>
                      {auth.user?.name || 'ユーザー'}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {auth.user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* サインアウトボタン */}
              <NavigationItem
                href={routes.auth.apiSignOut()}
                icon={<LogOut />}
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
