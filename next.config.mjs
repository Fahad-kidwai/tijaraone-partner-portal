/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Prisma + Neon serverless driver + ws out of the webpack bundle:
    // bundling ws breaks its native bufferutil path ("bufferUtil.mask is
    // not a function") and kills DB connections in route handlers.
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-neon",
      "@neondatabase/serverless",
      "ws",
    ],
  },
};

export default nextConfig;
