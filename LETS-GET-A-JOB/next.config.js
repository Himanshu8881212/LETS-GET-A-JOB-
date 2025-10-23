/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true, // Enable gzip compression for all responses
  poweredByHeader: false, // Remove X-Powered-By header for security
}

module.exports = nextConfig

