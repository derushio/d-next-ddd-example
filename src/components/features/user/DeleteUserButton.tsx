'use client';

import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { deleteUser } from '@/app/server-actions/user/deleteUser';
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useServerAction } from '@/hooks/useServerAction';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const DeleteUserDialogContent = dynamic(
  () =>
    import(
      '@/components/features/user/DeleteUserButton/DeleteUserDialogContent'
    ),
  { loading: () => <Loading variant='spinner' size='sm' /> },
);

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  variant?: 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** 削除確定時に即座に呼ばれるOptimistic更新コールバック */
  onOptimisticDelete?: () => void;
  onSuccess?: () => void;
}

/**
 * ユーザー削除ボタンコンポーネント
 * Client Component（削除確認ダイアログ付き）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - 削除確認ダイアログ機能（shadcn/ui AlertDialog使用）
 * - 削除成功時の自動遷移
 */
export function DeleteUserButton({
  userId,
  userName,
  variant = 'destructive',
  size = 'lg',
  className = '',
  onOptimisticDelete,
  onSuccess,
}: DeleteUserButtonProps) {
  const { execute, isPending } = useServerAction({
    defaultErrorMessage: 'ユーザーの削除に失敗しました',
    redirectTo: routes.users.list(),
    onSuccess,
  });

  const handleDelete = () => {
    // 削除確定直後にOptimistic更新を実行（即座に反映）
    onOptimisticDelete?.();

    execute(async () => {
      const result = await deleteUser({ userId });

      if (!result.success) {
        // NOTE: Client ComponentではサーバーサイドDI(ILogger/pino)が使用不可のため、console.errorが正当
        console.error('ユーザー削除失敗:', result.error);
        toast.error(result.error || 'ユーザーの削除に失敗しました');
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isPending}
          className={cn('cursor-pointer', className)}
        >
          {isPending ? '削除中...' : size === 'sm' ? '削除' : 'ユーザーを削除'}
        </Button>
      </AlertDialogTrigger>
      <DeleteUserDialogContent
        isPending={isPending}
        onDelete={handleDelete}
        userName={userName}
      />
    </AlertDialog>
  );
}
