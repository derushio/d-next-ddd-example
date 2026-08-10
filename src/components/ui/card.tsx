import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm transition-[box-shadow,transform,opacity] duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border-border py-6',
        bordered: 'border-2 border-border py-6',
        elevated: 'shadow-lg hover:shadow-xl py-6',
        glass: 'bg-card/80 border-border/20 shadow-lg py-6',
        aurora:
          'bg-gradient-to-br from-violet-50 to-cyan-50 border-violet-200/50 shadow-lg hover:shadow-xl py-6',
        sunset:
          'bg-gradient-to-br from-orange-50 to-pink-50 border-orange-200/50 shadow-lg hover:shadow-xl py-6',
        ocean:
          'bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200/50 shadow-lg hover:shadow-xl py-6',
        cosmic:
          'bg-gradient-to-br from-red-50 to-purple-50 border-red-200/50 shadow-lg hover:shadow-xl py-6',
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
  hover?: boolean;
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
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-title'
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-description'
      className={cn('text-sm text-muted-foreground', className)}
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
      className={cn('px-6', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-footer'
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

// Compound Pattern（既存システム互換）
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Action = CardAction;

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
