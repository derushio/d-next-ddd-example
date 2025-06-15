'use server';

import { UserEmail } from '@/components/atom/user/UserEmail';
import { HeaderClient } from '@/components/navigation/header/HeaderClient';
import { Sidenav } from '@/components/navigation/sidenav/Sidenav';
import { Spinner } from 'flowbite-react';
import { ReactNode, Suspense } from 'react';

/**
 * BodyClientからServer Componentに戻すためのコンポーネント
 */
export async function BodyContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <div className='z-50'>
        <Suspense>
          <Sidenav />
        </Suspense>
      </div>

      <div className='relative h-full z-0'>
        <HeaderClient
          UserEmail={
            <Suspense fallback={<Spinner />}>
              <UserEmail />
            </Suspense>
          }
        />

        {/* ページ本体 */}
        <div className='relative z-0 h-full w-full overflow-x-hidden pt-14'>
          {children}
        </div>
      </div>
    </>
  );
}
