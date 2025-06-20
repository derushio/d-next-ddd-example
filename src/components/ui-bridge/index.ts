/**
 * UI Bridge System
 * 既存システムとshadcn/uiのブリッジシステム
 *
 * 段階的移行を可能にする統合レイヤー
 */

// =================================
// 既存システム（レガシー）
// =================================
export { Button as LegacyButton } from '@/components/ui-legacy/Button';
export { Card as LegacyCard } from '@/components/ui-legacy/Card';
export { Input as LegacyInput } from '@/components/ui-legacy/Input';
export { Alert as LegacyAlert } from '@/components/ui-legacy/Alert';
export { Badge as LegacyBadge } from '@/components/ui-legacy/Badge';
export { Loading as LegacyLoading } from '@/components/ui-legacy/Loading';
export { Spinner as LegacySpinner } from '@/components/ui-legacy/Spinner';
export { Toast as LegacyToast } from '@/components/ui-legacy/Toast';

// =================================
// shadcn/ui システム（拡張版）
// =================================
export { Button as ShadcnButton } from '@/components/ui-shadcn/button-enhanced';
export { Card as ShadcnCard } from '@/components/ui-shadcn/card-enhanced';
export { Input as ShadcnInput } from '@/components/ui-shadcn/input';
export { Alert as ShadcnAlert } from '@/components/ui-shadcn/alert';
export { Badge as ShadcnBadge } from '@/components/ui-shadcn/badge';
export {
  showToast as ShadcnToast,
  Toaster as ShadcnToaster,
} from '@/components/ui-shadcn/toast-enhanced';

// 標準 shadcn/ui コンポーネント
export {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui-shadcn/form';
export { Label } from '@/components/ui-shadcn/label';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui-shadcn/dialog';
export { Separator } from '@/components/ui-shadcn/separator';

// =================================
// デフォルト（新規作成時は shadcn/ui を推奨）
// =================================
export { Button } from '@/components/ui-shadcn/button-enhanced';
export { Card } from '@/components/ui-shadcn/card-enhanced';
export { Input } from '@/components/ui-shadcn/input';
export { Alert } from '@/components/ui-shadcn/alert';
export { Badge } from '@/components/ui-shadcn/badge';
export { showToast, Toaster } from '@/components/ui-shadcn/toast-enhanced';

// =================================
// 型定義エクスポート
// =================================
export type { ButtonProps } from '@/components/ui-shadcn/button-enhanced';
export type { CardProps } from '@/components/ui-shadcn/card-enhanced';
