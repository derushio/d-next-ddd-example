'use client';

import { clsx } from 'clsx';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { useServices } from '@/hooks/useServices';
import { useToast } from '@/components/providers/ToastProvider';

import { Toast } from '@/components/ui-legacy/Toast';
import { Button } from '@/components/ui-legacy/Button';
import { ReactNode, useEffect, useState, memo } from 'react';
import { HiXMark } from 'react-icons/hi2';
import { useInterval } from 'usehooks-ts';

/**
 * トーストステート、アニメの更新頻度
 */
const frameper = 50;

/**
 * トーストの表示時間
 */
const animMaxCount = 6000 / frameper;
/**
 * トーストの切り替え時間
 */
const animCount = 150 / frameper;

// 後方互換性のため（段階的移行用）
export type { ToastStateContextType } from '@/components/providers/ToastProvider';
export { ToastContext as ToastStateContext } from '@/components/providers/ToastProvider';

/**
 * トーストコンポーネント
 *
 * 軽微な状態管理最適化:
 * - 新しいToastProviderとuseToastフック使用
 * - memo最適化による再レンダリング防止
 * - Context分離による責務明確化
 *
 * DIサービス統合対応:
 * - useServices Hook統合による構造化ログ出力
 * - DI経由でのエラーハンドリング改善
 * - Client Component内でのサービス活用例示
 */
export const AppToast = memo(function AppToast() {
  const { toasts, setToasts } = useToast();
  const { logger, utils } = useServices();

  const { isMounted } = useIsMountedCheck();
  const { isSm } = useBreakpoint('sm');

  const [animCounter, setAnimCounter] = useState(0);
  const [currentToast, setCurrentToast] = useState<ReactNode>();

  // Component mount/unmount logging
  useEffect(() => {
    utils.logComponentMount('AppToast', {
      initialToastCount: toasts.length,
      isSm,
    });

    return () => {
      utils.logComponentUnmount('AppToast');
    };
  }, [utils, toasts.length, isSm]);

  // Toast state change logging
  useEffect(() => {
    if (toasts.length > 0) {
      logger.info('Toast キューに追加', {
        queueLength: toasts.length,
        currentToastExists: !!currentToast,
      });
    }
  }, [toasts.length, logger, currentToast]);

  /**
   * frameper時間ごとに以下のどちらかの動作を行う
   * 1. トーストステートから新しいトーストを取得しアニメーションを開始する
   * 2. トーストのアニメーションカウンタを+1する
   */
  useInterval(() => {
    if (currentToast && animCounter < animMaxCount) {
      setAnimCounter(animCounter + 1);
    } else {
      if (toasts.length > 0) {
        setCurrentToast(toasts[0]);
        setToasts(toasts.filter((_, i) => 0 < i));

        logger.info('Toast表示開始', {
          remainingToasts: toasts.length - 1,
          animationStarted: true,
        });
      }

      setAnimCounter(0);
    }
  }, frameper);

  /**
   * トーストのY座標を算出する
   */
  function toastTranslateY() {
    let y = '500%';
    if (animCounter < animCount) {
      // 表示するアニメーション
      y = '500%';
    } else if (animCounter < animMaxCount - animCount * 2) {
      // animCount * 2なのは隠してから隠してる状態をanimCountだけ維持させるため
      // 表示する
      y = '0';
    } else {
      // 隠すアニメーション
      y = '500%';
    }

    return y;
  }

  /**
   * トースト手動クローズ処理
   * DIサービス統合対応: ユーザーアクションログ追加
   */
  function handleToastClose() {
    utils.logUserAction('toast_manual_close', {
      animCounter,
      remainingToasts: toasts.length,
    });

    // 隠すアニメーションを即時起動
    setAnimCounter(animMaxCount - animCount * 2);
  }

  return (
    <div
      className={clsx(
        'fixed z-50 top-0 left-0 right-0 h-full pointer-events-none ml-0 sm:ml-72',
      )}
    >
      <div className={clsx('relative top-0 left-0 w-full h-full')}>
        {isMounted && currentToast && (
          <div
            className={clsx(
              'absolute bottom-6 left-1/2 -translate-x-1/2 px-4 w-full sm:w-auto max-w-md',
            )}
            style={{
              transform: `translateX(-50%) translateY(${toastTranslateY()})`,
            }}
          >
            <Toast
              variant='info'
              className={clsx('pointer-events-auto w-full shadow-2xl')}
              onClose={handleToastClose}
              showCloseButton={true}
            >
              <div className={clsx('w-full')}>{currentToast}</div>
            </Toast>
          </div>
        )}
      </div>
    </div>
  );
});
