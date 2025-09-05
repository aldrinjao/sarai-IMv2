/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables for production
  env: {
    GOOGLE_SERVICE_KEY: process.env.GOOGLE_SERVICE_KEY,
  },

  // Optimize images
  images: {
    domains: ['earthengine.googleapis.com'],
    unoptimized: true
  },

  // Enable compression
  compress: true,

  // Production optimizations
  experimental: {
    optimizeCss: true,
  },

  // Configure headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Configure redirects if needed
  async redirects() {
    return []
  },

  // Webpack configuration for Earth Engine compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig