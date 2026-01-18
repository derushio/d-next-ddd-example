import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * シンプルなマウントチェックフック
 * React 18+ の useSyncExternalStore を使用した実装
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
