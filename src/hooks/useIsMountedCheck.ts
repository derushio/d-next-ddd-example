import { useEffect, useState } from 'react';

/**
 * シンプルなマウントチェックフック
 * 無限ループを避けたシンプルな実装
 */
export function useIsMountedCheck() {
  const [isMounted, setIsMounted] = useState(false);
  const [isMountedDelay, setIsMountedDelay] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // 少し遅延してからisMountedDelayをtrueに
    const timer = setTimeout(() => {
      setIsMountedDelay(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      setIsMounted(false);
      setIsMountedDelay(false);
    };
  }, []);

  return { isMounted, isMountedDelay };
}
