'use client';

import {
  ToastStateContext,
  ToastStateContextType,
} from '@/components/atom/general/toast/AppToast';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { ReactNode, createContext, useEffect, useState } from 'react';

type BodyStateContextType = {
  isSidenavOpen: boolean;
  isSidenavHide: boolean;
  /** sidenav分のmargin */
  sidenavMargin: string;
};

/**
 * Body内全体で使用するステートコンテキスト
 */
export const BodyStateContext = createContext<
  BodyStateContextType & {
    setIsSidenavOpen: (value: boolean) => void;
    setIsSidenavHide: (value: boolean) => void;
  }
>({
  isSidenavOpen: false,
  isSidenavHide: false,
  sidenavMargin: 'sm:ml-72',

  setIsSidenavOpen(value) {
    return;
  },
  setIsSidenavHide(value) {
    return;
  },
});

/**
 * 全体向けContextを生成するためのコンポーネント
 */
export function BodyContainerClient({ children }: { children: ReactNode }) {
  const { isMountedDelay } = useIsMountedCheck();

  /**
   * Body内全体で使用するステート
   */
  const [bodyState, setBodyState] = useState<BodyStateContextType>({
    isSidenavOpen: false,
    isSidenavHide: false,
    sidenavMargin: 'sm:ml-72',
  });

  function setIsSidenavOpen(value: boolean) {
    setBodyState((prevState) => ({
      ...prevState,
      isSidenavOpen: value,
    }));
  }
  function setIsSidenavHide(value: boolean) {
    setBodyState((prevState) => ({
      ...prevState,
      isSidenavHide: value,
    }));
  }

  /**
   * トーストのステートコンテキスト
   */
  const [toastState, setToastState] = useState<ToastStateContextType>({
    toasts: [],
  });

  function setToasts(toasts: ReactNode[]) {
    setToastState((prevState) => ({
      ...prevState,
      toasts: toasts,
    }));
  }
  function addToast(toast: ReactNode) {
    setToastState((prevState) => ({
      ...prevState,
      toasts: [...prevState.toasts, toast],
    }));
  }

  // sidenav分のmarginを更新
  useEffect(() => {
    setBodyState((prevState) => ({
      ...prevState,
      sidenavMargin: prevState.isSidenavHide ? 'sm:ml-0' : 'sm:ml-72',
    }));
  }, [bodyState.isSidenavHide]);

  return (
    <BodyStateContext.Provider
      value={{ ...bodyState, setIsSidenavOpen, setIsSidenavHide }}
    >
      <ToastStateContext.Provider
        value={{ ...toastState, setToasts, addToast }}
      >
        <div
          className={`h-full ml-0 ${isMountedDelay ? 'transition-margin' : ''} ${bodyState.sidenavMargin}`}
        >
          {children}
        </div>
      </ToastStateContext.Provider>
    </BodyStateContext.Provider>
  );
}
