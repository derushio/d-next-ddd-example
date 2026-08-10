/**
 * 型安全なルート定数
 *
 * Next.js typedRoutes（next.config.ts の typedRoutes: true）により、
 * <Link href> はRoute型でコンパイル時チェックされる。
 * router.push() も Route 型を渡すことで型チェックが効く。
 *
 * 全ページ遷移はこのファイルの routes 定数経由で行うこと。
 * 文字列リテラルによる router.push('/xxx') / <Link href="/xxx"> は禁止。
 *
 * ## search params の扱い
 * users.list() のように search params を受け取るルートは関数形式にする。
 * URLSearchParams で安全にクエリ文字列を構築し、Route 型にキャストして返す。
 */
import type { Route } from 'next';

/** ユーザー一覧の検索・ソートパラメータ */
export interface UsersListParams {
  page?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * search params を URLSearchParams で安全に構築してルートURLを返す
 * undefined の値は自動的に除外される
 */
function buildUsersListPath(params?: UsersListParams): Route {
  if (!params) return '/users' as Route;

  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.search !== undefined) searchParams.set('search', params.search);
  if (params.sortBy !== undefined) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder !== undefined)
    searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  return (query ? `/users?${query}` : '/users') as Route;
}

export const routes = {
  home: '/' satisfies Route,
  users: {
    /** ユーザー一覧（search params省略可） */
    list: (params?: UsersListParams) => buildUsersListPath(params),
    new: '/users/new' satisfies Route,
    detail: (id: string) => `/users/${id}` as Route,
    edit: (id: string) => `/users/${id}/edit` as Route,
  },
  auth: {
    signIn: '/auth/sign-in' satisfies Route,
    register: '/auth/register' satisfies Route,
    error: '/auth/error' satisfies Route,
    /**
     * NextAuth.js の signIn エンドポイント（callbackUrl 付き）
     * Infrastructure → NextAuth.js の URL 体系に依存するため api/ 配下を直接使用
     */
    apiSignIn: (callbackUrl = '/') =>
      `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route,
    /**
     * NextAuth.js の signOut エンドポイント（callbackUrl 付き）
     */
    apiSignOut: (callbackUrl = '/') =>
      `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route,
  },
  legal: {
    privacy: '/privacy' satisfies Route,
    terms: '/terms' satisfies Route,
  },
  support: {
    contact: '/contact' satisfies Route,
    help: '/help' satisfies Route,
  },
} as const;
