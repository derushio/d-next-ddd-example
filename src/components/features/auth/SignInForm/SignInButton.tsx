import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';

interface SignInButtonProps {
  isLoading: boolean;
}

/**
 * サインインフォーム - サインインボタン
 *
 * 分離されたボタンコンポーネント：
 * - ローディング状態の表示
 * - グラデーション効果
 * - アニメーション効果
 */
export function SignInButton({ isLoading }: SignInButtonProps) {
  return (
    <Button
      type='submit'
      variant='aurora'
      size='lg'
      fullWidth
      loading={isLoading}
      disabled={isLoading}
      className={clsx(
        'shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] transition-all duration-300',
      )}
    >
      {isLoading ? 'サインイン中...' : 'サインイン'}
    </Button>
  );
}
