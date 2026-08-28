/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Load these from node_modules at runtime instead of bundling them.
    serverComponentsExternalPackages: ["@libsql/client", "@libsql/isomorphic-ws", "libsql"],
  },
  webpack: (config) => {
    // `node:sqlite` is a Node builtin used only for the local-dev fallback.
    config.externals = config.externals || [];
    config.externals.push({ "node:sqlite": "commonjs node:sqlite" });
    return config;
  },
};

export default nextConfig;
