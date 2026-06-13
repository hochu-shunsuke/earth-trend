import type { MetadataRoute } from "next";

const base = "https://earth-trend.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/mirror`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/explore`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/globe`, changeFrequency: "hourly", priority: 0.6 },
  ];
}
