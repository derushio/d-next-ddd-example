import { User } from 'lucide-react';
import { getCurrentUserCached } from '@/utils/auth/getCurrentUserCached';

/**
 * ユーザーメールアドレス表示コンポーネント
 * Server Component
 *
 * DDD/Clean Architecture パターン:
 * - GetCurrentUserUseCaseを使用してユーザー情報取得
 * - Infrastructure層の実装詳細を隠蔽
 * - モダンなデザインとアニメーション効果
 */
export async function UserEmail() {
  const result = await getCurrentUserCached();

  if (!result.isOk()) {
    return (
      <div className='flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted/40'>
        <User className='size-4 text-muted-foreground/70' />
        <span className='text-sm text-muted-foreground/70 font-medium'>
          未サインイン
        </span>
      </div>
    );
  }

  // メールアドレスを短縮表示（ローカル部分のみ表示）
  const displayEmail =
    result.value.email.length > 20
      ? `${result.value.email.split('@')[0]}@...`
      : result.value.email;

  return (
    <div className='flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/35 transition-all duration-200 cursor-pointer group'>
      <div className='flex-shrink-0'>
        <div className='size-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-200'>
          <User className='size-3 text-white' />
        </div>
      </div>
      <div className='flex-1 min-w-0'>
        <span
          className='text-sm font-medium text-white truncate block'
          title={result.value.email}
        >
          {displayEmail}
        </span>
      </div>
      {result.value.name && (
        <div className='text-xs text-primary/70 bg-primary/20 px-2 py-0.5 rounded-full'>
          {result.value.name.substring(0, 8)}
        </div>
      )}
    </div>
  );
}
