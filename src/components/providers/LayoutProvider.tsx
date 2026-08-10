'use client';

import {
  createContext,
  memo,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useBreakpoint } from '@/hooks/useMediaQuery';

export type LayoutState = {
  isSidenavOpen: boolean;
  isSidenavHide: boolean;
};

export type LayoutAction =
  | { type: 'TOGGLE_SIDENAV' }
  | { type: 'SET_SIDENAV_OPEN'; payload: boolean }
  | { type: 'SET_SIDENAV_HIDE'; payload: boolean };

export type LayoutContextType = LayoutState & {
  sidenavMargin: string;
  setIsSidenavOpen: (value: boolean) => void;
  setIsSidenavHide: (value: boolean) => void;
};

/**
 * サイドナビ状態管理用のReducer
 * 軽微な状態管理最適化: useReducer部分導入
 */
function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'TOGGLE_SIDENAV':
      return {
        ...state,
        isSidenavOpen: !state.isSidenavOpen,
      };

    case 'SET_SIDENAV_OPEN':
      return {
        ...state,
        isSidenavOpen: action.payload,
      };

    case 'SET_SIDENAV_HIDE':
      return {
        ...state,
        isSidenavHide: action.payload,
      };

    default:
      return state;
  }
}

/**
 * レイアウト専用コンテキスト
 * 軽微な状態管理最適化: Context分離実装
 */
export const LayoutContext = createContext<LayoutContextType>({
  isSidenavOpen: false,
  isSidenavHide: false,
  sidenavMargin: 'ml-0 sm:ml-72',
  setIsSidenavOpen: () => {},
  setIsSidenavHide: () => {},
});

/**
 * レイアウト状態管理Provider
 *
 * 最適化ポイント:
 * - useReducer による状態統一管理
 * - レイアウト状態のみに責務を限定
 * - useCallback による function 参照安定化
 * - memo による不必要な再レンダリング防止
 * - モバイル対応強化
 */
// React Compiler: removable when adopted
export const LayoutProvider = memo(function LayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(layoutReducer, {
    isSidenavOpen: false,
    isSidenavHide: false,
  });

  // デスクトップ→モバイルへブレークポイント遷移時のみサイドナビを閉じる
  // isSidenavOpen の変化単独では発火させない（モバイルで開いた状態を維持するため）
  const { isSm } = useBreakpoint('sm');
  const isMobile = !isSm;
  const prevIsMobileRef = useRef(isMobile);
  useEffect(() => {
    if (!prevIsMobileRef.current && isMobile && state.isSidenavOpen) {
      dispatch({ type: 'SET_SIDENAV_OPEN', payload: false });
    }
    prevIsMobileRef.current = isMobile;
  }, [isMobile, state.isSidenavOpen]);

  // 便利なヘルパー関数
  // React Compiler: removable when adopted
  const setIsSidenavOpen = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SIDENAV_OPEN', payload: value });
  }, []);

  // React Compiler: removable when adopted
  const setIsSidenavHide = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SIDENAV_HIDE', payload: value });
  }, []);

  // sidenavMargin は isSidenavHide から完全な派生値として算出
  const sidenavMargin = state.isSidenavHide ? 'ml-0' : 'ml-0 sm:ml-72';

  // React Compiler: removable when adopted
  const contextValue = useMemo(
    () => ({
      ...state,
      sidenavMargin,
      setIsSidenavOpen,
      setIsSidenavHide,
    }),
    [state, sidenavMargin, setIsSidenavOpen, setIsSidenavHide],
  );

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
});

/**
 * レイアウトコンテキスト使用Hook
 */
export function useLayout() {
  const context = use(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
