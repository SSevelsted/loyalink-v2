import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "0" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self' capacitor: ionic: https://my.loyalink.ai",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' capacitor: ionic: https://my.loyalink.ai https://js.stripe.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://ryjyhddvwsmpagggepgk.supabase.co",
      "font-src 'self' data:",
      "connect-src * wss:",
      "frame-src 'self' https://js.stripe.com capacitor: ionic:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const embedHeaders = [
  ...securityHeaders.filter((header) => header.key !== "X-Frame-Options"),
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'self' https://app.streamink.co https://dashboard.streamink.co http://localhost:* http://127.0.0.1:*",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray lockfile in the home
  // directory otherwise makes Turbopack infer ~/ as the root and try to watch
  // the entire home tree, which hangs dev startup at "Starting...".
  turbopack: {
    root: __dirname,
  },
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ryjyhddvwsmpagggepgk.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: embedHeaders,
      },
      {
        source: "/((?!embed/).*)",
        headers: securityHeaders,
      },
    ];
  },
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default bundleAnalyzer(nextConfig);
