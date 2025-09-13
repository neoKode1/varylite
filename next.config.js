/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // Allow cross-origin requests from local network during development
  allowedDevOrigins: [
    '10.0.0.14', // Your local network IP
    'localhost',
    '127.0.0.1',
  ],
  webpack: (config) => {
    // Exclude Supabase Edge Functions from Next.js build
    config.externals = config.externals || [];
    config.externals.push({
      'supabase/functions': 'commonjs supabase/functions',
    });
    return config;
  },
}

module.exports = nextConfig
