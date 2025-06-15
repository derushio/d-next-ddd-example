import { objectkeys } from '@/utils/objectkeys';

/**
 * オブジェクトのキーと値をマッピングして新しい配列を作成します。
 */
export function kvmap<T, U extends string | number | symbol, V>(
  obj: Record<U, T>,
  fn: (key: U, value: T, index: number) => V,
): V[] {
  return objectkeys(obj).map((key, i) => {
    return fn(key, obj[key], i);
  });
}
