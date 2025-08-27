import { authOptions } from '@/layers/infrastructure/persistence/nextAuth';

import NextAuth from 'next-auth';

/**
 * next-authのpage, apiなどを生成
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
