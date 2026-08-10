import { capitalize } from 'es-toolkit/string';
import { useMediaQuery } from 'usehooks-ts';

/**
 * Tailwind v4 対応ブレークポイント定数
 *
 * Tailwind v4 では CSS custom properties ベース（@theme inline）に移行したため、
 * tailwindcss/defaultTheme からの JS 読み取りは非推奨。
 * プロジェクトの Tailwind 設定（CSS変数）と同期した定数として直接定義する。
 *
 * 参考: https://tailwindcss.com/docs/responsive-design
 */
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const satisfies Record<string, `${number}px`>;

type BreakpointKey = keyof typeof breakpoints;

/**
 * breakpointを解決
 */
export function useBreakpoint<K extends BreakpointKey>(
  breakpointKey: K,
): { [key in `is${Capitalize<string & K>}`]: boolean } {
  const bool = useMediaQuery(`(min-width: ${breakpoints[breakpointKey]})`);
  const capitalizedKey = capitalize(breakpointKey);

  return {
    [`is${capitalizedKey}`]: bool,
  } as { [key in `is${Capitalize<string & K>}`]: boolean };
}
