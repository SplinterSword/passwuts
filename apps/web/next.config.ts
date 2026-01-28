/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@pm/types", "@pm/crypto"],
}

export default nextConfig
