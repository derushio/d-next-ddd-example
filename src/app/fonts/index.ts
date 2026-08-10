import localFont from 'next/font/local';

export const geistSansFont = localFont({
  src: './GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 200 300 400 500 600 700 800 900',
});

export const geistMonoFont = localFont({
  src: './GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 200 300 400 500 600 700 800 900',
});
