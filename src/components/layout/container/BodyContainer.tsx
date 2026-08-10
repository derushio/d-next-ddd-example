import { type ReactNode, Suspense } from 'react';
import { DivSpinner } from '@/components/common/DivSpinner';
import { UserEmail } from '@/components/common/UserEmail';
import { HeaderClient } from '@/components/layout/header/HeaderClient';
import { Sidenav } from '@/components/layout/sidebar/Sidenav';

/**
 * BodyClientからServer Componentに戻すためのコンポーネント
 */
export async function BodyContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <div className='z-50'>
        <Suspense fallback={<div className='w-72 shrink-0' />}>
          <Sidenav />
        </Suspense>
      </div>

      <div className='relative h-full z-0'>
        <HeaderClient
          UserEmail={
            <Suspense fallback={<DivSpinner />}>
              <UserEmail />
            </Suspense>
          }
        />

        {/* ページ本体 */}
        <div className='relative z-0 size-full overflow-x-hidden pt-14'>
          {children}
        </div>
      </div>
    </>
  );
}
