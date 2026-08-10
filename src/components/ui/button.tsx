import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transform hover:scale-[1.02] active:scale-[0.98] duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        // Modern Gradient Variants (globals.css utility classes)
        aurora:
          'gradient-aurora text-white shadow-lg hover:shadow-xl focus:ring-violet-300 duration-300',
        sunset:
          'gradient-sunset text-white shadow-lg hover:shadow-xl focus:ring-orange-300 duration-300',
        ocean:
          'gradient-ocean text-white shadow-lg hover:shadow-xl focus:ring-teal-300 duration-300',
        cosmic:
          'gradient-cosmic text-white shadow-lg hover:shadow-xl focus:ring-red-300 duration-300',
        solar:
          'gradient-solar text-white shadow-lg hover:shadow-xl focus:ring-yellow-300 duration-300',
        animated:
          'gradient-animated text-white shadow-lg hover:shadow-xl focus:ring-violet-300 duration-300',
        glass:
          'gradient-glass text-gray-900 shadow-lg hover:shadow-xl focus:ring-violet-300 duration-300',

        // State colors
        success:
          'bg-success text-white hover:bg-success/90 focus:ring-green-300 shadow-lg duration-300',
        warning:
          'bg-warning text-white hover:bg-warning/90 focus:ring-yellow-300 shadow-lg duration-300',
        info: 'bg-info text-white hover:bg-info/90 focus:ring-cyan-300 shadow-lg duration-300',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: 'h-7 rounded-md gap-1 px-2 text-xs has-[>svg]:px-1.5',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        md: 'h-10 px-5 py-2.5 has-[>svg]:px-4',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': 'size-7',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
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
  loading?: boolean;
  fullWidth?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot='button'
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <Spinner
              size='sm'
              className='-ml-1 mr-2 border-current/25 border-t-current'
            />
          )}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
