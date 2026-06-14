import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";
import { toLocale } from "@/lib/i18n";

const META = {
  ja: {
    title: "問いを見つける",
    description:
      "「なぜ私は」「どうすれば」——人類が検索窓に半分打った問いを、世界の検索が続けていく。集合的無意識を覗く鏡。",
  },
  en: {
    title: "Quest",
    description:
      "“why am I”, “how do I” — the half-typed questions humanity puts into the search box, continued by the world's searches. A mirror onto the collective unconscious.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  return {
    ...META[locale],
    alternates: { canonical: `/${locale}/quest`, languages: { ja: "/ja/quest", en: "/en/quest" } },
  };
}

export default function MirrorPage() {
  return <GraphExplorer mode="mirror" />;
}
