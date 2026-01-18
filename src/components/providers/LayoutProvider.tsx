'use client';

import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

export type LayoutState = {
  isSidenavOpen: boolean;
  isSidenavHide: boolean;
  sidenavMargin: string;
};

export type LayoutAction =
  | { type: 'TOGGLE_SIDENAV' }
  | { type: 'SET_SIDENAV_OPEN'; payload: boolean }
  | { type: 'SET_SIDENAV_HIDE'; payload: boolean }
  | { type: 'UPDATE_MARGIN'; payload: string };

export type LayoutContextType = LayoutState & {
  dispatch: React.Dispatch<LayoutAction>;
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
        // デスクトップ時のマージン制御（モバイル時は常にml-0）
        sidenavMargin: action.payload ? 'ml-0' : 'ml-0 sm:ml-72',
      };

    case 'UPDATE_MARGIN':
      return {
        ...state,
        sidenavMargin: action.payload,
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
  dispatch: () => {},
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
export const LayoutProvider = memo(function LayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(layoutReducer, {
    isSidenavOpen: false,
    isSidenavHide: false,
    sidenavMargin: 'ml-0 sm:ml-72',
  });

  // モバイル時の初期設定：サイドナビを閉じた状態で開始
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 640; // sm breakpoint
      if (isMobile) {
        dispatch({ type: 'SET_SIDENAV_OPEN', payload: false });
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 便利なヘルパー関数
  const setIsSidenavOpen = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SIDENAV_OPEN', payload: value });
  }, []);

  const setIsSidenavHide = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SIDENAV_HIDE', payload: value });
  }, []);

  const contextValue = useCallback(
    () => ({
      ...state,
      dispatch,
      setIsSidenavOpen,
      setIsSidenavHide,
    }),
    [state, setIsSidenavOpen, setIsSidenavHide],
  );

  return (
    <LayoutContext.Provider value={contextValue()}>
      {children}
    </LayoutContext.Provider>
  );
});

/**
 * レイアウトコンテキスト使用Hook
 */
export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
