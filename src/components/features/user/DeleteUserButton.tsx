'use client';

import { deleteUser } from '@/app/server-actions/user/deleteUser';
import { Button } from '@/components/ui/Button';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  variant?: 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: () => void;
}

/**
 * ユーザー削除ボタンコンポーネント
 * Client Component（削除確認ダイアログ付き）
 *
 * DDD/Clean Architecture パターン:
 * - Server Actionを通じてUseCaseを呼び出し
 * - 削除確認ダイアログ機能
 * - 削除成功時の自動遷移
 */
export function DeleteUserButton({
  userId,
  userName,
  variant = 'destructive',
  size = 'lg',
  className = '',
  onSuccess,
}: DeleteUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // 削除確認ダイアログ
    const confirmed = confirm(
      `本当に「${userName}」を削除しますか？\n\nこの操作は取り消せません。`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteUser({ userId });

      if ('success' in result && result.success) {
        // 削除成功時の処理
        if (onSuccess) {
          onSuccess();
        } else {
          // onSuccessが指定されていない場合はユーザー一覧にリダイレクト
          router.push('/users');
          router.refresh();
        }
      } else if ('error' in result) {
        alert(`削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
      alert('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDelete}
      disabled={isLoading}
      className={clsx('cursor-pointer', className)}
    >
      {isLoading ? '削除中...' : size === 'sm' ? '削除' : '🗑️ ユーザーを削除'}
    </Button>
  );
}
