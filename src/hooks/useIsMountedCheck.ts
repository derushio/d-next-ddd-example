import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * SSR対応のマウント状態検出フック（意図的なカスタム実装）
 *
 * ## WARNING: 外部ライブラリへの置き換え禁止
 *
 * `usehooks-ts` の `useIsClient()` / `useIsMounted()` や他の外部ライブラリへの
 * 置き換えは禁止。以下の理由でこのカスタム実装が必要:
 *
 * 1. **SSR/CSRハイドレーション精度**: `useSyncExternalStore` のサーバースナップショット
 *    (`() => false`) で、SSR→CSR遷移時の値の不整合を完全に防止。
 *    `useState` ベースの実装（usehooks-ts の `useIsClient()` 等）は
 *    React の batching/scheduling に依存するため、ハイドレーション batching 中に
 *    一瞬 true になるリスクがある。
 *
 * 2. **段階的表示制御 (isMountedDelay)**: マウントから100ms後に true になる遅延フラグを提供。
 *    CSSトランジション/アニメーションが完了してから表示を開始する用途に使用。
 *    `usehooks-ts` にはこの機能がない。
 *
 * @returns {{ isMounted: boolean, isMountedDelay: boolean }}
 * - `isMounted` — useEffect実行直後にtrue（SSR出し分け用）
 * - `isMountedDelay` — マウントから100ms後にtrue（トランジション開始用）
 */
export function useIsMountedCheck() {
  const isMountedRef = useRef(false);
  const isMountedDelayRef = useRef(false);
  const subscribersRef = useRef(new Set<() => void>());

  // サブスクライブ関数
  const subscribe = (callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  };

  // マウント状態の外部ストア
  const isMounted = useSyncExternalStore(
    subscribe,
    () => isMountedRef.current,
    () => false, // サーバーサイドでは常にfalse
  );

  const isMountedDelay = useSyncExternalStore(
    subscribe,
    () => isMountedDelayRef.current,
    () => false,
  );

  useEffect(() => {
    const subscribers = subscribersRef.current;

    isMountedRef.current = true;
    subscribers.forEach((callback) => {
      callback();
    });

    // 少し遅延してからisMountedDelayをtrueに
    const timer = setTimeout(() => {
      isMountedDelayRef.current = true;
      subscribers.forEach((callback) => {
        callback();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
      isMountedDelayRef.current = false;
      subscribers.forEach((callback) => {
        callback();
      });
    };
  }, []);

  return { isMounted, isMountedDelay };
}
