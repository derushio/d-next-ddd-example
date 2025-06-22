'use server';

import { ClientServiceExample } from '@/components/common/ClientServiceExample';

import Image from 'next/image';

/**
 * 🌟 Aurora TOPページ
 * モダンなグラデーションデザインによる美しいホームページ
 * DI統合デモ: Client Component DI統合のデモを表示
 */
export default async function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 relative overflow-hidden'>
      {/* 🌟 Background decorative elements */}
      <div className='absolute inset-0 opacity-30'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-violet-400 to-pink-400 rounded-full blur-3xl'></div>
        <div className='absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full blur-3xl'></div>
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-pink-300 to-orange-300 rounded-full blur-3xl'></div>
      </div>

      {/* Main content */}
      <div className='relative z-10 grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-full py-12 gap-8 sm:py-16 lg:py-20'>
        <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-6xl mx-auto sm:gap-12'>
          {/* 🎨 Hero Section */}
          <div className='text-center sm:text-left'>
            <div className='mb-8 flex justify-center sm:justify-start'>
              <Image
                src='/next.svg'
                alt='Next.js logo'
                width={200}
                height={42}
                priority
                className='dark:invert opacity-70 hover:opacity-100 transition-opacity duration-300'
              />
            </div>

            <h1 className='text-5xl sm:text-7xl font-bold mb-6'>
              <span className='bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent'>
                Welcome to
              </span>
              <br />
              <span className='bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 bg-clip-text text-transparent'>
                Next App
              </span>
            </h1>

            <p className='text-xl text-gray-600 mb-8 max-w-2xl'>
              モダンなClean Architecture + DDDベースのWebアプリケーション。
              美しいAuroraグラデーションデザインで次世代の開発体験を提供します。
            </p>
          </div>

          {/* 🌟 DI統合デモ - 視覚的バランス重視 */}
          <section className='w-full max-w-none'>
            <div className='bg-white/25 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden'>
              <div className='px-6 py-6 text-center border-b border-white/15'>
                <h2 className='text-2xl sm:text-3xl font-bold'>
                  <span className='bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent'>
                    DI統合デモンストレーション
                  </span>
                </h2>
              </div>
              <div className='p-6'>
                <ClientServiceExample />
              </div>
            </div>
          </section>

          {/* 💎 Getting Started */}
          <div className='bg-white/20 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/30 w-full'>
            <h3 className='text-2xl font-bold mb-6'>
              <span className='bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent'>
                Getting Started
              </span>
            </h3>
            <ol className='list-inside list-decimal text-lg space-y-4 text-gray-700'>
              <li className='flex items-center space-x-3'>
                <span>Get started by editing</span>
                <code className='bg-gradient-to-r from-violet-100 to-cyan-100 px-3 py-1 rounded-lg font-semibold text-violet-800 border border-violet-200'>
                  src/app/page.tsx
                </code>
              </li>
              <li>
                Save and see your changes instantly with beautiful Aurora
                gradients!
              </li>
            </ol>
          </div>

          {/* ✨ Action Buttons */}
          <div className='flex gap-4 sm:gap-6 items-center flex-col sm:flex-row w-full justify-center sm:justify-start'>
            <a
              className='bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-full px-8 py-4 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-3 group'
              href='https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Image
                className='group-hover:scale-110 transition-transform duration-300'
                src='/vercel.svg'
                alt='Vercel logomark'
                width={24}
                height={24}
              />
              Deploy now
            </a>
            <a
              className='bg-white/30 backdrop-blur-xl border border-white/50 text-gray-800 rounded-full px-8 py-4 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-white/50 sm:min-w-44'
              href='https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
              target='_blank'
              rel='noopener noreferrer'
            >
              Read our docs
            </a>
          </div>
        </main>

        {/* 🌟 Footer */}
        <footer className='row-start-3 flex gap-8 flex-wrap items-center justify-center'>
          <div className='bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/30'>
            <div className='flex gap-8 flex-wrap items-center justify-center'>
              <a
                className='flex items-center gap-3 text-gray-700 hover:text-violet-600 transition-colors duration-300 font-medium'
                href='https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Image
                  aria-hidden
                  src='/file.svg'
                  alt='File icon'
                  width={18}
                  height={18}
                  className='opacity-70'
                />
                Learn
              </a>
              <a
                className='flex items-center gap-3 text-gray-700 hover:text-pink-600 transition-colors duration-300 font-medium'
                href='https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Image
                  aria-hidden
                  src='/window.svg'
                  alt='Window icon'
                  width={18}
                  height={18}
                  className='opacity-70'
                />
                Examples
              </a>
              <a
                className='flex items-center gap-3 text-gray-700 hover:text-cyan-600 transition-colors duration-300 font-medium'
                href='https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Image
                  aria-hidden
                  src='/globe.svg'
                  alt='Globe icon'
                  width={18}
                  height={18}
                  className='opacity-70'
                />
                Go to nextjs.org →
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
