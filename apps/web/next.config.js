const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  transpilePackages: [
    '@proofrail/sdk',
    '@proofrail/shared',
    '@creit.tech/stellar-wallets-kit',
    '@stellar/stellar-sdk',
    '@stellar/freighter-api',
  ],

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    unoptimized: true,
  },

  webpack(config, { isServer }) {
    // ── Monorepo root resolution ──────────────────────────────────────────────
    // Allow webpack to find packages hoisted to the repo root node_modules
    // when Next.js is run from apps/web.
    config.resolve.modules = [
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];

    // ── Silence sodium-native warnings ──────────────────────────────────────
    // @stellar/stellar-base tries to require('sodium-native') — a native Node
    // addon — and falls back to tweetnacl in the browser. Webpack emits
    // "Critical dependency" warnings for the dynamic require; the code itself
    // works fine. We suppress the warnings instead of breaking the fallback.
    //
    // 1) exprContextCritical disables warnings for dynamic expressions.
    // 2) IgnorePlugin prevents webpack from actually bundling sodium-native.
    config.module.exprContextCritical = false;

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^sodium-native$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^require-addon$/,
      }),
    );

    return config;
  },
};

module.exports = nextConfig;
