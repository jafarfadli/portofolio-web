import type { NextConfig } from "next";

/** Same for both roles. The CSP is per request (nonce), so it is set in src/proxy.ts instead. */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/**
 * Optional mount path (BASE_PATH=/portofolio) for serving under a sub-path. Build-time: it is inlined into the bundles.
 * Exposed to code as NEXT_PUBLIC_BASE_PATH through src/lib/base-path.ts.
 */
const basePath = process.env.BASE_PATH ?? "";
if (basePath && !/^\/[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*$/.test(basePath)) {
  throw new Error(`BASE_PATH must look like /portofolio (leading slash, no trailing slash), got "${basePath}"`);
}

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  experimental: {
    // Uploads go through the save action, up to five images per form. The browser scales each one down first
    // (src/components/admin/shrink-image.ts) and refuses to send more than 36 MB. The proxy buffers bodies too.
    serverActions: { bodySizeLimit: "40mb" },
    proxyClientMaxBodySize: "40mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
