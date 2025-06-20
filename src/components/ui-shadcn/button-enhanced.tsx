import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils-shadcn';

// 既存システムの gradient 機能を shadcn/ui に統合
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transform hover:scale-[1.02] active:scale-[0.98] duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',

        // 🌟 2024年トレンド：現代的グラデーション機能
        primary:
          'bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-300 shadow-lg transition-all duration-300',

        // 🌌 Modern Gradient Variants
        aurora:
          'bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl focus:ring-violet-300 transition-all duration-300 hover:scale-[1.02]',
        sunset:
          'bg-gradient-to-r from-orange-500 via-pink-400 to-purple-500 text-white shadow-xl hover:shadow-2xl focus:ring-orange-300 transition-all duration-300 hover:scale-[1.02]',
        ocean:
          'bg-gradient-to-r from-teal-500 via-green-500 to-blue-500 text-white shadow-xl hover:shadow-2xl focus:ring-teal-300 transition-all duration-300 hover:scale-[1.02]',
        cosmic:
          'bg-gradient-to-r from-red-500 via-pink-500 to-violet-500 text-white shadow-xl hover:shadow-2xl focus:ring-red-300 transition-all duration-300 hover:scale-[1.02]',
        solar:
          'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl focus:ring-yellow-300 transition-all duration-300 hover:scale-[1.02]',
        animated:
          'bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl focus:ring-violet-300 transition-all duration-300 hover:scale-[1.02] animate-pulse',
        glass:
          'bg-white/10 backdrop-blur-xl text-gray-900 shadow-xl hover:shadow-2xl focus:ring-violet-300 transition-all duration-300 hover:scale-[1.02] border border-white/20',

        // 🎯 Legacy compatibility (新グラデーション使用)
        gradient:
          'bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl focus:ring-violet-300 transition-all duration-300 hover:scale-[1.02]',
        'gradient-danger':
          'bg-gradient-to-r from-red-500 via-pink-500 to-violet-500 text-white shadow-xl hover:shadow-2xl focus:ring-red-300 transition-all duration-300 hover:scale-[1.02]',
        blue: 'bg-gradient-to-r from-teal-500 via-green-500 to-blue-500 text-white shadow-xl hover:shadow-2xl focus:ring-teal-300 transition-all duration-300 hover:scale-[1.02]',

        // 🌈 State colors (modern)
        success:
          'bg-green-500 hover:bg-green-600 text-white focus:ring-green-300 shadow-lg transition-all duration-300',
        warning:
          'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-300 shadow-lg transition-all duration-300',
        info: 'bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-300 shadow-lg transition-all duration-300',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-sm',
        md: 'h-9 px-4 py-2 has-[>svg]:px-3 text-sm',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean; // 既存システムの loading 機能
  fullWidth?: boolean; // 既存システムの fullWidth 機能
  gradient?: boolean; // 既存システムの gradient 機能（非推奨、variantを使用推奨）
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  fullWidth = false,
  gradient = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // gradient propが指定された場合、variantを上書き（後方互換性）
  const effectiveVariant = gradient ? 'gradient' : variant;

  return (
    <Comp
      data-slot='button'
      className={cn(
        buttonVariants({ variant: effectiveVariant, size }),
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className='animate-spin -ml-1 mr-2 h-4 w-4'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
        >
          <circle
            className='opacity-25'
            cx='12'
            cy='12'
            r='10'
            stroke='currentColor'
            strokeWidth='4'
          />
          <path
            className='opacity-75'
            fill='currentColor'
            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
          />
        </svg>
      )}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
