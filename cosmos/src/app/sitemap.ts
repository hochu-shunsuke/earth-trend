import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/mirror`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/explore`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${SITE_URL}/globe`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
