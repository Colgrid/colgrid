/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No ESLint package is installed yet; don't block builds on it.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
