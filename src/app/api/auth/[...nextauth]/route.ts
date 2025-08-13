import { authOptions } from '@/layers/infrastructure/auth/nextauth.config';

import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
