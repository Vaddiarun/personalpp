/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // node:sqlite is a built-in; make sure Next/webpack does not try to bundle it.
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ "node:sqlite": "commonjs node:sqlite" });
    return config;
  },
};

export default nextConfig;
