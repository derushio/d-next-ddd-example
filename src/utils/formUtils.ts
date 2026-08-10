import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

/**
 * Server Action の fieldErrors を react-hook-form に適用するユーティリティ
 */
export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string[] | undefined> | undefined,
): void {
  if (!fieldErrors) return;
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (Array.isArray(value) && value.length > 0 && value[0] !== undefined) {
      form.setError(key as Path<T>, {
        type: 'server',
        message: value[0],
      });
    }
  }
}
