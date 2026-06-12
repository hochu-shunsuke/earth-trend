import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 0.5 },
    ...TOOLS.map((tool) => ({
      url: `${SITE_URL}/${tool.slug}`,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ];
}
