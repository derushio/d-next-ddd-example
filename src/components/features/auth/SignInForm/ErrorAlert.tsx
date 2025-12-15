import { Card } from '@/components/ui/card';

import { clsx } from 'clsx';
import { HiExclamationTriangle } from 'react-icons/hi2';

interface ErrorAlertProps {
  error: string;
}

/**
 * サインインフォーム - エラー表示アラート
 *
 * 分離されたエラー表示コンポーネント：
 * - 視覚的に目立つエラー表示
 * - アニメーション効果
 * - アクセシビリティ対応
 */
export function ErrorAlert({ error }: ErrorAlertProps) {
  return (
    <Card
      variant='bordered'
      padding='md'
      className={clsx(
        'border-[var(--error-muted)] bg-[var(--error-light)] animate-fade-in',
      )}
    >
      <div className={clsx('flex items-center space-x-3')}>
        <div className={clsx('flex-shrink-0')}>
          <HiExclamationTriangle
            className={clsx('h-5 w-5 text-[var(--error)]')}
          />
        </div>
        <div className={clsx('flex-1')}>
          <h3 className={clsx('text-sm font-medium text-[var(--error)]')}>
            サインインエラー
          </h3>
          <p className={clsx('text-sm text-[var(--error)] mt-1')}>{error}</p>
        </div>
      </div>
    </Card>
  );
}
