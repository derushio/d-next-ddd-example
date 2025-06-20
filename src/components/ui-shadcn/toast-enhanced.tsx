import { Toaster as Sonner } from 'sonner';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
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
          // 既存システムのステート色統合
          success:
            'group-[.toast]:bg-success group-[.toast]:text-success-foreground group-[.toast]:border-success/20',
          error:
            'group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground group-[.toast]:border-destructive/20',
          warning:
            'group-[.toast]:bg-warning group-[.toast]:text-warning-foreground group-[.toast]:border-warning/20',
          info: 'group-[.toast]:bg-info group-[.toast]:text-info-foreground group-[.toast]:border-info/20',
        },
      }}
      {...props}
    />
  );
};

// 既存のAppToastとの統合ヘルパー
export const showToast = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),
  info: (message: string, description?: string) =>
    toast.info(message, { description }),
  default: (message: string, description?: string) =>
    toast(message, { description }),
};

export { Toaster, toast };
