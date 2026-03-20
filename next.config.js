import withPWA from '@ducanh2912/next-pwa'

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [],
  async rewrites() {
    return [
      {
        source: '/m/:id.:ext(png|jpg|jpeg|webp)',
        destination: '/i/:id.:ext',
      },
    ]
  },
}

export default withPWAConfig(nextConfig)
