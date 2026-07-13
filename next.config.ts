import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Allow this app to be embedded in an iframe on the Shopify storefront
            // (and any *.myshopify.com preview/dev store) rather than the default
            // same-origin-only framing policy.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://zga7xd-t6.myshopify.com https://*.myshopify.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
