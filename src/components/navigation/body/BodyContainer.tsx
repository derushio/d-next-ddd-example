'use server';

import { clsx } from 'clsx';
import { UserEmail } from '@/components/atom/user/UserEmail';
import { HeaderClient } from '@/components/navigation/header/HeaderClient';
import { Sidenav } from '@/components/navigation/sidenav/Sidenav';

import { DivSpinner } from '@/components/atom/general/DivSpinner';
import { ReactNode, Suspense } from 'react';

/**
 * BodyClientからServer Componentに戻すためのコンポーネント
 */
export async function BodyContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <div className={clsx('z-50')}>
        <Suspense>
          <Sidenav />
        </Suspense>
      </div>

      <div className={clsx('relative h-full z-0')}>
        <HeaderClient
          UserEmail={
            <Suspense fallback={<DivSpinner />}>
              <UserEmail />
            </Suspense>
          }
        />

        {/* ページ本体 */}
        <div
          className={clsx('relative z-0 h-full w-full overflow-x-hidden pt-14')}
        >
          {children}
        </div>
      </div>
    </>
  );
}
