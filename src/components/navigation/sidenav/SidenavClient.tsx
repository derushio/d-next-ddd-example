'use client';

import { BodyStateContext } from '@/components/navigation/body/BodyContainerClient';
import { getAuth } from '@/layers/infrastructure/persistence/nextAuth';
import { useIsMountedCheck } from '@/hooks/useIsMountedCheck';
import {
  Sidebar,
  SidebarItem,
  SidebarItemGroup,
  SidebarItems,
} from 'flowbite-react';
import { useContext } from 'react';
import { HiArrowSmLeft, HiArrowSmRight } from 'react-icons/hi';

export function SidenavClient({
  auth,
}: {
  auth: Awaited<ReturnType<typeof getAuth>>;
}) {
  const { isMounted, isMountedDelay } = useIsMountedCheck();
  const { isSidenavOpen, isSidenavHide } = useContext(BodyStateContext);

  return (
    <Sidebar
      className={`fixed top-0 left-0 overflow-hidden z-50 w-72 h-screen  ${isMountedDelay ? 'transition-transition' : ''} ${isSidenavOpen && !isSidenavHide ? 'translate-x-0' : '-translate-x-full'} ${!isSidenavHide ? 'sm:translate-x-0' : '-sm:translate-x-full'}`}
    >
      <SidebarItems className='h-full'>
        <div className='h-full flex flex-col'>
          <SidebarItemGroup>
            <SidebarItem href='/'>
              <h1>Create Next App</h1>
            </SidebarItem>
          </SidebarItemGroup>

          <SidebarItemGroup className='grow' />

          <SidebarItemGroup>
            {isMounted && !auth && (
              <SidebarItem
                href='/api/auth/signin?callbackUrl=/'
                icon={HiArrowSmRight}
              >
                <h2>Sign In</h2>
              </SidebarItem>
            )}
            {isMounted && auth && (
              <SidebarItem
                href='/api/auth/signout?callbackUrl=/'
                icon={HiArrowSmLeft}
              >
                <h2>Sign Out</h2>
              </SidebarItem>
            )}
          </SidebarItemGroup>
        </div>
      </SidebarItems>
    </Sidebar>
  );
}
