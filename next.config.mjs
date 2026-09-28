import createNextIntlPlugin from 'next-intl/plugin';  
const withNextIntl = createNextIntlPlugin('./i18n.ts');  
/** @type {import('next').NextConfig} */  
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: { serverComponentsExternalPackages: [] },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] }
};  
export default withNextIntl(nextConfig); 
