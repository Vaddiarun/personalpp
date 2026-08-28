/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client (and its optional native `libsql` addon) must not be bundled
  // by webpack — let Node require it at runtime.
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
};

export default nextConfig;
