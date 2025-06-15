import { useMediaQuery } from 'react-responsive';
// FIXME: 設定値通りにする
import * as theme from 'tailwindcss/defaultTheme';

const breakpoints = theme.default.screens;

type BreakpointKey = keyof typeof breakpoints;

/**
 * breakpointを解決
 */
export function useBreakpoint<K extends BreakpointKey>(
  breakpointKey: K,
): { [key in `is${Capitalize<string & K>}`]: boolean } {
  const bool = useMediaQuery({
    query: `(min-width: ${breakpoints[breakpointKey]})`,
  });
  const capitalizedKey =
    (breakpointKey as string)[0].toUpperCase() +
    (breakpointKey as string).substring(1);

  return {
    [`is${capitalizedKey}`]: bool,
  } as { [key in `is${Capitalize<string & K>}`]: boolean };
}
