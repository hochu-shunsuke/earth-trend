import { SITE_URL } from "@/lib/site";
import type { Tool } from "@/lib/tools";

/** ツールページ用のWebApplication構造化データ */
export default function ToolJsonLd({ tool }: { tool: Tool }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/${tool.slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
    inLanguage: "ja",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
