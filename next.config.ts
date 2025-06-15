import withFlowbiteReact from 'flowbite-react/plugin/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: '*',
      },
    ],
  },
  /**
   * TSyringe DI Container対応のWebpack設定
   * reflect-metadataがServer Side Renderingで確実に初期化されるよう設定
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server側で別のentrypoint追加してreflect-metadataを先に読み込み
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();

        // Object.entries で安全に処理
        if (typeof entries === 'object' && entries !== null) {
          for (const [key, value] of Object.entries(entries)) {
            if (Array.isArray(value)) {
              // 既にreflect-metadataが含まれている場合はスキップ
              if (!value.includes('reflect-metadata')) {
                entries[key] = ['reflect-metadata', ...value];
              }
            }
          }
        }

        return entries;
      };
    }

    return config;
  },
};

export default withFlowbiteReact(nextConfig);
