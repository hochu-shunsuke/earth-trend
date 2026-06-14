import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";

export default function sitemap(): MetadataRoute.Sitemap {
  const countries: MetadataRoute.Sitemap = Object.keys(GEO_LABELS).map((g) => ({
    url: `${SITE_URL}/${g.toLowerCase()}`,
    changeFrequency: "hourly",
    priority: 0.8,
  }));
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...countries,
    { url: `${SITE_URL}/quest`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/analysis`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${SITE_URL}/globe`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
