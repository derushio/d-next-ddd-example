'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * NextAuth SessionProvider のラッパー
 * Client Component
 *
 * DDD/Clean Architecture パターン:
 * - NextAuthのセッション管理をアプリケーション全体で提供
 * - Client Componentとして必要最小限の範囲で実装
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
