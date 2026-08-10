'use client';

import type * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      data-slot='toaster'
      className='toaster group'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toast]:bg-success/10 group-[.toast]:text-success-foreground group-[.toast]:border-success/30',
          error:
            'group-[.toast]:bg-destructive/10 group-[.toast]:text-destructive-foreground group-[.toast]:border-destructive/30',
          warning:
            'group-[.toast]:bg-warning/10 group-[.toast]:text-warning-foreground group-[.toast]:border-warning/30',
          info: 'group-[.toast]:bg-info/10 group-[.toast]:text-info-foreground group-[.toast]:border-info/30',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
