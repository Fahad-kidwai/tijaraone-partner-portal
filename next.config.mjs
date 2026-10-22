/**
 * Security headers (host-agnostic — applied by Next itself, Phase 6 §9).
 *
 * CSP is sized to what this app actually serves:
 * - system font stack only -> font-src 'self'
 * - images are local files under /images -> img-src 'self' (+ data: for
 *   inline icons)
 * - no external scripts, fonts, or APIs are loaded by the browser
 * - script-src needs 'unsafe-inline': Next.js App Router emits inline
 *   bootstrap/RSC <script> blocks and this app runs no nonce middleware.
 *   'unsafe-eval' is deliberately NOT allowed anywhere.
 * - style-src needs 'unsafe-inline': Tailwind output is a static
 *   stylesheet, but React inline style attributes (progress-bar widths)
 *   and Next's injected style tags require it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HSTS only over HTTPS in production (never pin localhost/dev to HTTPS).
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
