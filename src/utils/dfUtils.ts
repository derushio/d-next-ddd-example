import * as dfns from 'date-fns';
import { ja } from 'date-fns/locale';

export { dfns };

/**
 * date-fns format DBなどショートフォーマット
 * yyyy-MM-dd
 */
export const dateShortFormats = ['yyyy-MM-dd', { locale: ja }] as const;

/**
 * date-fns format 日本向けショートフォーマット
 * yyyy/MM/dd
 */
export const japaneseDateShortFormats = ['yyyy/MM/dd', { locale: ja }] as const;

/**
 * date-fns format 日本向けショートフォーマット
 * yyyy年M月d日
 */
export const japaneseDateLocaleFormats = [
  'yyyy年M月d日',
  { locale: ja },
] as const;

/**
 * date-fns format 日本向けショートフォーマット
 * yyyy年M月d日
 */
export const japaneseDateTimeLocaleFormats = [
  'yyyy年M月d日 HH:mm',
  { locale: ja },
] as const;

/**
 * date-fns format DBなどdatetimeショートフォーマット
 * yyyy-MM-dd
 */
export const dateTimeShortFormats = [
  'yyyy-MM-dd HH:mm',
  { locale: ja },
] as const;

/**
 * date-fns format 日本向けDateTimeフォーマット
 * yyyy/MM/dd (eee) HH:mm
 */
export const japaneseDateTimeFormats = [
  'yyyy/MM/dd (eee) HH:mm',
  { locale: ja },
] as const;

/**
 * date-fns format 日本向けDate曜日付きフォーマット
 * yyyy/MM/dd (eee)
 */
export const japaneseDateFormats = [
  'yyyy/MM/dd (eee)',
  { locale: ja },
] as const;

/**
 * date-fns format 日本向けDateTimeフォーマット
 * HH:mm
 */
export const japaneseTimeFormats = ['HH:mm', { locale: ja }] as const;

/**
 * 日付を日本語ショートフォーマットでフォーマット
 * yyyy/MM/dd
 */
export function formatJaDate(date: Date | string | number): string {
  return dfns.format(new Date(date), ...japaneseDateShortFormats);
}

/**
 * 日付を日本語日時フォーマットでフォーマット（日付+時刻）
 * yyyy/MM/dd (eee) HH:mm
 */
export function formatJaDateTimeFull(date: Date | string | number): string {
  return dfns.format(new Date(date), ...japaneseDateTimeFormats);
}

/**
 * 日付を日本語日時フォーマットでフォーマット（秒なし）
 * yyyy年M月d日 HH:mm
 */
export function formatJaDateTime(date: Date | string | number): string {
  return dfns.format(new Date(date), ...japaneseDateTimeLocaleFormats);
}

/**
 * 日付を時刻フォーマットでフォーマット
 * HH:mm
 */
export function formatTime(date: Date | string | number): string {
  return dfns.format(new Date(date), ...japaneseTimeFormats);
}
