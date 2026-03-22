const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@selfly/shared"],
  // Use standalone output for production deployment (Vercel handles this automatically)
  webpack: (config, { isServer }) => {
    // In monorepo, ensure Next.js uses React 19 (not React 18 from mobile workspace)
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime"),
    };
    return config;
  },
};

module.exports = nextConfig;
