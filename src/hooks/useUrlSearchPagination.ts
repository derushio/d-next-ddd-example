'use client';

import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useDebounceValue } from 'usehooks-ts';

/** Server Action レスポンスの最小型（ActionResultと互換） */
interface FetchResult<TData> {
  success: boolean;
  data?: TData;
  error?: string;
}

interface UseUrlSearchPaginationOptions<TData, TSortBy extends string> {
  /** SSRからの初期データ（クライアント初回fetchをスキップ） */
  initialData?: TData | undefined;
  /** デフォルトのソートフィールド */
  defaultSortBy: TSortBy;
  /** デフォルトのソート順 */
  defaultSortOrder: 'asc' | 'desc';
  /** デバウンス遅延（ms）。デフォルト: 300 */
  debounceMs?: number | undefined;
  /** ページサイズ */
  pageSize?: number | undefined;
  /** URLパラメータからルートURLを構築する関数 */
  buildRoute: (params: {
    page: number;
    search: string;
    sortBy: TSortBy;
    sortOrder: 'asc' | 'desc';
  }) => Route;
  /** データ取得関数 */
  fetchFn: (params: {
    page: number;
    limit: number;
    search?: string | undefined;
    sortBy: TSortBy;
    sortOrder: 'asc' | 'desc';
  }) => Promise<FetchResult<TData>>;
  /** URLパラメータの初期値（SSR時のパラメータ） */
  initialParams?:
    | {
        page?: number | undefined;
        searchQuery?: string | undefined;
        sortBy?: TSortBy | undefined;
        sortOrder?: 'asc' | 'desc' | undefined;
      }
    | undefined;
}

interface UseUrlSearchPaginationReturn<TData, TSortBy extends string> {
  /** 取得済みデータ */
  data: TData | null;
  /** データのsetter（useOptimistic等との連携用） */
  setData: React.Dispatch<React.SetStateAction<TData | null>>;
  /** エラーメッセージ */
  error: string | null;
  /** ローディング状態 */
  isPending: boolean;
  /** 検索入力値 */
  searchInputValue: string;
  /** 検索入力値のsetter */
  setSearchInputValue: (value: string) => void;
  /** ページ変更ハンドラ */
  handlePageChange: (page: number) => void;
  /** 検索ボタンハンドラ（即時検索） */
  handleSearch: () => void;
  /** キーダウンハンドラ（Enter即時検索） */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** データ再取得関数（削除後のリフレッシュ等） */
  fetchData: (params?: { page?: number; search?: string }) => void;
  /** 現在のページ番号 */
  currentPage: number;
  /** 現在のソートフィールド */
  currentSortBy: TSortBy;
  /** 現在のソート順 */
  currentSortOrder: 'asc' | 'desc';
}

/**
 * URL search params と連動したページネーション・検索・ソートを管理する汎用Hook
 *
 * 機能:
 * - URLパラメータ（page, search, sortBy, sortOrder）の読み取りと同期
 * - デバウンス付き検索（debounceMs ms後にURL更新）
 * - Enter / 検索ボタンによる即時検索
 * - SSR初期データがある場合の初回クライアントfetchスキップ
 * - startTransition による isPending 状態管理
 */
export function useUrlSearchPagination<TData, TSortBy extends string>({
  initialData,
  defaultSortBy,
  defaultSortOrder,
  debounceMs = 300,
  pageSize = 10,
  buildRoute,
  fetchFn,
  initialParams,
}: UseUrlSearchPaginationOptions<TData, TSortBy>): UseUrlSearchPaginationReturn<
  TData,
  TSortBy
> {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL search params から初期値を読み取る（URL優先、fallback は initialParams）
  const currentPage =
    Number(searchParams.get('page')) || initialParams?.page || 1;
  const currentSearch =
    searchParams.get('search') ?? initialParams?.searchQuery ?? '';
  // safe: values set by buildRoute which enforces type constraints
  const currentSortBy =
    (searchParams.get('sortBy') as TSortBy) ??
    (initialParams?.sortBy as TSortBy) ??
    defaultSortBy;
  // safe: values set by buildRoute which enforces type constraints
  const currentSortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc') ??
    initialParams?.sortOrder ??
    defaultSortOrder;

  // initialDataがある場合はSSRデータを初期値として使用（初回クライアントフェッチをスキップ）
  const [data, setData] = useState<TData | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 検索入力値（即時反映）と debounce 後の値
  const [searchInputValue, setSearchInputValue] = useState(currentSearch);
  const [debouncedSearch] = useDebounceValue(searchInputValue, debounceMs);

  // データ取得関数
  // React Compiler: removable when adopted
  const fetchData = useCallback(
    (params?: { page?: number; search?: string }) => {
      setError(null);

      startTransition(async () => {
        try {
          const resolvedSearch =
            params?.search !== undefined
              ? params.search || undefined
              : currentSearch || undefined;

          const fetchParams: Parameters<typeof fetchFn>[0] = {
            page: params?.page ?? currentPage,
            limit: pageSize,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder,
            ...(resolvedSearch !== undefined ? { search: resolvedSearch } : {}),
          };

          const result = await fetchFn(fetchParams);

          if (result.success) {
            setData(result.data ?? null);
          } else {
            setError(result.error ?? null);
          }
        } catch (err) {
          // NOTE: Client ComponentではサーバーサイドDI(ILogger/pino)が使用不可のため、console.errorが正当
          console.error('データ取得エラー:', err);
          setError('予期しないエラーが発生しました');
        }
      });
    },
    [
      fetchFn,
      currentPage,
      currentSearch,
      currentSortBy,
      currentSortOrder,
      pageSize,
    ],
  );

  // 初回マウント判定用（initialDataがある場合は初回fetchをスキップ）
  const isFirstFetchSkipped = useRef(initialData !== undefined);

  // URL params（page, debouncedSearch, sortBy, sortOrder）の変化を検知してデータをfetch
  useEffect(() => {
    // 初回マウント時にinitialDataがある場合はSSRデータをそのまま使用してスキップ
    if (isFirstFetchSkipped.current) {
      isFirstFetchSkipped.current = false;
      return;
    }

    fetchData({
      page: currentPage,
      search: debouncedSearch,
    });
  }, [currentPage, debouncedSearch, fetchData]);

  // debounce後の検索テキストが変化したらページを1に戻してURL更新
  // 初回マウント時（currentSearchと一致している間）はURL更新しない
  const isFirstDebounceSkipped = useRef(true);
  useEffect(() => {
    if (isFirstDebounceSkipped.current) {
      isFirstDebounceSkipped.current = false;
      return;
    }

    router.replace(
      buildRoute({
        page: 1,
        search: debouncedSearch,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      }),
    );
  }, [debouncedSearch, router, buildRoute, currentSortBy, currentSortOrder]);

  // ページ変更: URL を更新（useEffect が変化を検知してfetchする）
  // React Compiler: removable when adopted
  const handlePageChange = useCallback(
    (page: number) => {
      router.replace(
        buildRoute({
          page,
          search: debouncedSearch,
          sortBy: currentSortBy,
          sortOrder: currentSortOrder,
        }),
      );
    },
    [router, buildRoute, debouncedSearch, currentSortBy, currentSortOrder],
  );

  // 検索ボタン押下（debounceをスキップしてURL更新）
  // React Compiler: removable when adopted
  const handleSearch = useCallback(() => {
    router.replace(
      buildRoute({
        page: 1,
        search: searchInputValue,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
      }),
    );
  }, [router, buildRoute, searchInputValue, currentSortBy, currentSortOrder]);

  // Enter キーで即時検索（debounceをスキップしてURL更新）
  // React Compiler: removable when adopted
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        router.replace(
          buildRoute({
            page: 1,
            search: searchInputValue,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder,
          }),
        );
      }
    },
    [router, buildRoute, searchInputValue, currentSortBy, currentSortOrder],
  );

  return {
    data,
    setData,
    error,
    isPending,
    searchInputValue,
    setSearchInputValue,
    handlePageChange,
    handleSearch,
    handleKeyDown,
    fetchData,
    currentPage,
    currentSortBy,
    currentSortOrder,
  };
}
