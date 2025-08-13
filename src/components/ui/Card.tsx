import { cn } from '@/lib/utils-shadcn';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

// 🌟 Enhanced Card システム - Aurora Gradient対応
const cardVariants = cva(
  'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border-border py-6',
        bordered: 'border-2 border-border py-6',
        elevated: 'shadow-lg hover:shadow-xl py-6',
        glass: 'bg-card/80 backdrop-blur-sm border-border/20 shadow-lg py-6',
        // 🌟 Aurora Gradient Variants
        aurora:
          'bg-gradient-to-br from-violet-50 to-cyan-50 border-violet-200/50 shadow-xl hover:shadow-2xl py-6 backdrop-blur-sm',
        sunset:
          'bg-gradient-to-br from-orange-50 to-pink-50 border-orange-200/50 shadow-xl hover:shadow-2xl py-6 backdrop-blur-sm',
        ocean:
          'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200/50 shadow-xl hover:shadow-2xl py-6 backdrop-blur-sm',
        cosmic:
          'bg-gradient-to-br from-red-50 to-purple-50 border-red-200/50 shadow-xl hover:shadow-2xl py-6 backdrop-blur-sm',
        'aurora-dark':
          'bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-300/30 shadow-2xl hover:shadow-3xl py-6 backdrop-blur-xl',
      },
      padding: {
        none: 'py-0',
        sm: 'py-4',
        md: 'py-6',
        lg: 'py-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  },
);

export interface CardProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof cardVariants> {
  hover?: boolean; // 既存システムの hover 機能
}

function Card({
  className,
  variant,
  padding,
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot='card'
      className={cn(
        cardVariants({ variant, padding }),
        hover &&
          'hover:scale-[1.02] cursor-pointer transition-transform duration-200',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-header'
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 sm:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        // 既存システム互換
        'mb-4 pb-4 border-b border-border',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot='card-title'
      className={cn(
        'leading-none font-semibold text-2xl tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot='card-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-action'
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-content'
      className={cn('px-4 sm:px-6 text-card-foreground', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-footer'
      className={cn(
        'flex items-center px-4 sm:px-6 [.border-t]:pt-6',
        // 既存システム互換
        'mt-4 pt-4 border-t border-border flex justify-end gap-2',
        className,
      )}
      {...props}
    />
  );
}

// Compound Patternの設定（既存システム互換）
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Action = CardAction;

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
