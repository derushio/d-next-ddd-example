'use client';

import { BodyStateContext } from '@/components/navigation/body/BodyContainerClient';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import { Button, MegaMenu } from 'flowbite-react';
import { ReactNode, useContext } from 'react';
import { HiBars3 } from 'react-icons/hi2';

export function HeaderClient({ UserEmail }: { UserEmail: ReactNode }) {
  const { isMounted } = useIsMountedCheck();
  const { isSidenavOpen, setIsSidenavOpen, isSidenavHide } =
    useContext(BodyStateContext);

  return (
    <MegaMenu className='absolute z-40 h-14 w-full bg-primary text-white overflow-hidden rounded-none sm:rounded-none'>
      <div className='w-full flex justify-between items-center gap-2'>
        <div
          className={`flex-none overflow-hidden sm:w-0 ${isSidenavHide ? 'hidden' : 'block'}`}
        >
          {isMounted && (
            <Button
              onClick={() => {
                setIsSidenavOpen(!isSidenavOpen);
              }}
              color='primary'
              size='sm'
              className='cursor-pointer'
            >
              <HiBars3 size='20' />
            </Button>
          )}
        </div>

        <div className='grow' />

        <div className='flex-none'>{UserEmail}</div>
      </div>
    </MegaMenu>
  );
}
