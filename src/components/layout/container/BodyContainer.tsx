'use server';

import { clsx } from 'clsx';
import { UserEmail } from '@/components/common/UserEmail';
import { HeaderClient } from '@/components/layout/header/HeaderClient';
import { Sidenav } from '@/components/layout/sidebar/Sidenav';

import { DivSpinner } from '@/components/common/DivSpinner';
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
