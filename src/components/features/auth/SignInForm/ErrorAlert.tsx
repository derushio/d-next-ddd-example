import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorAlertProps {
  error: string;
}

/**
 * サインインフォーム - エラー表示アラート
 *
 * 分離されたエラー表示コンポーネント：
 * - shadcn/ui Alert variant='destructive' を使用
 * - アクセシビリティ対応
 */
export function ErrorAlert({ error }: ErrorAlertProps) {
  return (
    <Alert variant='destructive' data-testid='sign-in-error'>
      <AlertTitle>サインインエラー</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
