import { cn } from '@/lib/utils';

/**
 * BackgroundDecoration - Server Component
 *
 * ページ背景の2-blobグラデーション装飾。
 * 複数のページで共通して使用される装飾パターンを共通化。
 *
 * @example
 * <BackgroundDecoration blob1="blue-cyan" blob2="violet-pink" />
 */

/**
 * 利用可能なblobグラデーションのルックアップテーブル
 * Tailwind CSSは静的解析でクラスを検出するため、
 * 動的な文字列補間ではなく完全なクラス文字列を定義する
 */
const blobGradients: Record<string, string> = {
  'blue-cyan': 'bg-gradient-to-r from-blue-400 to-cyan-400',
  'violet-pink': 'bg-gradient-to-r from-violet-400 to-pink-400',
  'violet-cyan': 'bg-gradient-to-r from-violet-400 to-cyan-400',
  'violet-purple': 'bg-gradient-to-r from-violet-400 to-purple-400',
  'pink-orange': 'bg-gradient-to-r from-pink-400 to-orange-400',
  'purple-pink': 'bg-gradient-to-r from-purple-400 to-pink-400',
  'purple-violet': 'bg-gradient-to-r from-purple-400 to-violet-400',
  'green-emerald': 'bg-gradient-to-r from-green-400 to-emerald-400',
  'green-teal': 'bg-gradient-to-r from-green-400 to-teal-400',
  'teal-cyan': 'bg-gradient-to-r from-teal-400 to-cyan-400',
  'sky-indigo': 'bg-gradient-to-r from-sky-400 to-indigo-400',
  'blue-indigo': 'bg-gradient-to-r from-blue-400 to-indigo-400',
  'rose-red': 'bg-gradient-to-r from-rose-400 to-red-400',
  'amber-yellow': 'bg-gradient-to-r from-amber-400 to-yellow-400',
};

export type BlobGradientKey = keyof typeof blobGradients;

export interface BackgroundDecorationProps {
  /** 上部左側 blob のグラデーションキー（blobGradients のキー） */
  blob1?: BlobGradientKey;
  /** 下部右側 blob のグラデーションキー（blobGradients のキー） */
  blob2?: BlobGradientKey;
}

export function BackgroundDecoration({
  blob1 = 'blue-cyan',
  blob2 = 'violet-pink',
}: BackgroundDecorationProps) {
  const blob1Class = blobGradients[blob1] ?? blobGradients['blue-cyan'];
  const blob2Class = blobGradients[blob2] ?? blobGradients['violet-pink'];

  return (
    <div className='absolute inset-0 opacity-20'>
      <div
        className={cn(
          'absolute top-20 left-10 size-72 rounded-full blur-2xl will-change-transform',
          blob1Class,
        )}
      />
      <div
        className={cn(
          'absolute bottom-20 right-10 size-96 rounded-full blur-2xl will-change-transform',
          blob2Class,
        )}
      />
    </div>
  );
}
