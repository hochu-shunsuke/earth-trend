import type { NextConfig } from "next";

// 英語1本(2026-09-11)。ロケール接頭辞を廃止し、旧URL(/ja /en /es)は正準URLへ301で寄せる。
// middleware は使わない(全リクエストでVercel Middlewareを起動しないため)。
const LOCALE_PREFIXES = ["ja", "en", "es"];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /en/trends のような二重の旧URLを1ホップで畳む
      ...LOCALE_PREFIXES.map((l) => ({
        source: `/${l}/trends`,
        destination: "/",
        statusCode: 301 as const,
      })),
      { source: "/trends", destination: "/", statusCode: 301 as const },
      // ロケール接頭辞そのもの(旧ホーム)
      ...LOCALE_PREFIXES.map((l) => ({
        source: `/${l}`,
        destination: "/",
        statusCode: 301 as const,
      })),
      // ロケール接頭辞つきの下位ページ(/en/jp → /jp など)
      ...LOCALE_PREFIXES.map((l) => ({
        source: `/${l}/:path*`,
        destination: "/:path*",
        statusCode: 301 as const,
      })),
    ];
  },
};

export default nextConfig;
