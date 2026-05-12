import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Tắt overlay "Static / Dynamic / Content" góc phải dưới khi chạy dev
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'cdn.simpleicons.org' },
    ],
  },
}

export default nextConfig
