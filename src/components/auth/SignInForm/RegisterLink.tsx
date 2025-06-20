import { clsx } from 'clsx';
import Link from 'next/link';
import { HiUserPlus } from 'react-icons/hi2';

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
    <div className={clsx('text-center space-y-3')}>
      <div className={clsx('relative')}>
        <div className={clsx('absolute inset-0 flex items-center')}>
          <div className={clsx('w-full border-t border-[var(--border)]')} />
        </div>
        <div className={clsx('relative flex justify-center text-sm')}>
          <span
            className={clsx(
              'px-2 bg-[var(--surface)] text-[var(--text-muted)]',
            )}
          >
            または
          </span>
        </div>
      </div>

      <Link
        href='/auth/register'
        className={clsx(
          'group inline-flex items-center justify-center space-x-2',
          'text-sm font-medium text-[var(--primary)]',
          'hover:text-[var(--primary-hover)]',
          'transition-all duration-200 ease-in-out',
          'cursor-pointer',
          'p-2 rounded-lg',
          'hover:bg-[var(--primary-light)]',
        )}
      >
        <HiUserPlus
          className={clsx(
            'h-4 w-4 group-hover:scale-110 transition-transform duration-200',
          )}
        />
        <span>新規アカウントを作成</span>
      </Link>
    </div>
  );
}
