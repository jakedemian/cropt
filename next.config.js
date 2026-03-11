import withPWA from '@ducanh2912/next-pwa'

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@aws-sdk/client-rekognition', '@aws-sdk/client-s3'],
}

export default withPWAConfig(nextConfig)
