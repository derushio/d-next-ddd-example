'use client';

import {
  createContext,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

export type ToastStateContextType = {
  toasts: ReactNode[];
};

export type ToastContextType = ToastStateContextType & {
  setToasts: (toasts: ReactNode[]) => void;
  addToast: (toast: ReactNode) => void;
};

/**
 * トースト専用コンテキスト
 * 軽微な状態管理最適化: Context分離実装
 */
export const ToastContext = createContext<ToastContextType>({
  toasts: [],
  setToasts() {
    return;
  },
  addToast() {
    return;
  },
});

/**
 * トースト状態管理Provider
 *
 * 最適化ポイント:
 * - トースト状態のみに責務を限定
 * - useCallback によるfunction参照安定化
 * - memo による不必要な再レンダリング防止
 */
export const ToastProvider = memo(function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toastState, setToastState] = useState<ToastStateContextType>({
    toasts: [],
  });

  const setToasts = useCallback((toasts: ReactNode[]) => {
    setToastState((prevState) => ({
      ...prevState,
      toasts: toasts,
    }));
  }, []);

  const addToast = useCallback((toast: ReactNode) => {
    setToastState((prevState) => ({
      ...prevState,
      toasts: [...prevState.toasts, toast],
    }));
  }, []);

  const contextValue = useCallback(
    () => ({
      ...toastState,
      setToasts,
      addToast,
    }),
    [toastState, setToasts, addToast],
  );

  return (
    <ToastContext.Provider value={contextValue()}>
      {children}
    </ToastContext.Provider>
  );
});

/**
 * トーストコンテキスト使用Hook
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
