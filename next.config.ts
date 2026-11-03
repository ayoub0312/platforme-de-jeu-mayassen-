import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// Anti-clickjacking réservé aux espaces connectés : les pages publiques de jeu
// peuvent rester intégrables chez les partenaires.
const noFramingHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/partner/:path*", headers: noFramingHeaders },
      { source: "/partner", headers: noFramingHeaders },
      { source: "/client/:path*", headers: noFramingHeaders },
      { source: "/client", headers: noFramingHeaders },
    ];
  },
};

export default nextConfig;
