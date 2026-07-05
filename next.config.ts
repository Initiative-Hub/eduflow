import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '**/*.{tsx,jsx}': {
        loaders: [
          {
            loader: '@locator/webpack-loader',
            options: { env: 'development' },
          },
        ],
      },
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    proxyClientMaxBodySize: 100 * 1024 * 1024, // 100MB
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
