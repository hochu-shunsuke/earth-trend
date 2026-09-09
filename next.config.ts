import type { NextConfig } from "next";

const countryPaths = [
  "jp",
  "us",
  "gb",
  "in",
  "kr",
  "tw",
  "de",
  "fr",
  "br",
  "ca",
  "au",
  "ph",
  "ng",
  "za",
  "mx",
  "spain",
  "ar",
  "co",
  "id",
  "ru",
  "tr",
  "vn",
  "th",
  "it",
];
const defaultLocalePaths = ["trends", "analysis", "globe", "about", ...countryPaths];

const nextConfig: NextConfig = {
  // jaだけ接頭辞なしを正準URLにする。既知の静的経路に限定したconfig routingなら、
  // 全リクエストでVercel Middlewareを起動せずに同じURL体系を維持できる。
  async redirects() {
    return [
      { source: "/ja", destination: "/", statusCode: 301 },
      ...defaultLocalePaths.map((path) => ({
        source: `/ja/${path}`,
        destination: `/${path}`,
        statusCode: 301 as const,
      })),
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/ja" },
        ...defaultLocalePaths.map((path) => ({
          source: `/${path}`,
          destination: `/ja/${path}`,
        })),
        { source: "/trends/opengraph-image", destination: "/ja/trends/opengraph-image" },
        ...countryPaths.map((path) => ({
          source: `/${path}/opengraph-image`,
          destination: `/ja/${path}/opengraph-image`,
        })),
      ],
    };
  },
};

export default nextConfig;
