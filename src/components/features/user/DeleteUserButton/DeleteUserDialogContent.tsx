'use client';

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteUserDialogContentProps {
  isPending: boolean;
  onDelete: () => void;
  userName: string;
}

export default function DeleteUserDialogContent({
  isPending,
  onDelete,
  userName,
}: DeleteUserDialogContentProps) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>ユーザーの削除</AlertDialogTitle>
        <AlertDialogDescription>
          本当に「{userName}」を削除しますか？
          <br />
          この操作は取り消せません。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
        <AlertDialogAction
          onClick={onDelete}
          disabled={isPending}
          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
        >
          {isPending ? '削除中...' : '削除する'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
