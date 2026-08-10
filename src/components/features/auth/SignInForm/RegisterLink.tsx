import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * サインインフォーム - 新規登録リンク
 *
 * 分離されたナビゲーションコンポーネント：
 * - おしゃれなリンクスタイル
 * - ホバーアニメーション
 * - アイコン付きデザイン
 */
export function RegisterLink() {
  return (
    <div className='text-center space-y-3'>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-[var(--border)]' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='px-2 bg-[var(--surface)] text-[var(--text-muted)]'>
            または
          </span>
        </div>
      </div>

      <Link
        href={routes.auth.register}
        className={cn(
          'group inline-flex items-center justify-center space-x-2',
          'text-sm font-medium text-[var(--primary)]',
          'hover:text-[var(--primary-hover)]',
          'transition-all duration-200 ease-in-out',
          'cursor-pointer',
          'p-2 rounded-lg',
          'hover:bg-[var(--primary-light)]',
        )}
      >
        <UserPlus className='size-4 group-hover:scale-110 transition-transform duration-200' />
        <span>新規アカウントを作成</span>
      </Link>
    </div>
  );
}
