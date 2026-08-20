/** @type {import('next').NextConfig} */
const nextConfig = {
  // File uploads can exceed the default 1mb body limit for server actions/route handlers.
  experimental: {
    serverActions: { bodySizeLimit: '50mb' }
  }
};
module.exports = nextConfig;
