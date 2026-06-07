/** @type {import('next').NextConfig} */

// Security headers applied to every response. The CSP keeps the strong
// injection protections (no inline objects, locked base-uri/frame-ancestors)
// while staying permissive where the app legitimately needs it: images from
// Data Dragon, and API/XHR to the env-driven backend over https.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // Next.js injects inline hydration scripts; without per-request nonces
  // (which would force every page to render dynamically) 'unsafe-inline' is
  // required. 'unsafe-eval' covers dev/HMR and some runtime chunks.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://ddragon.leagueoflegends.com https://*.communitydragon.org",
  "font-src 'self' data:",
  // 'self' + any https origin so the env-configured API base works on any
  // deployment domain; localhost for local dev.
  "connect-src 'self' https: http://localhost:4000",
  "form-action 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lc/shared"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      // RFC 9116 security.txt, generated with an auto-rolling Expires date.
      { source: "/.well-known/security.txt", destination: "/api/security-txt" },
    ];
  },
};

export default nextConfig;
