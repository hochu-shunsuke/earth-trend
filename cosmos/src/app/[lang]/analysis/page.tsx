import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";
import { toLocale } from "@/lib/i18n";

const META = {
  ja: {
    title: "分析",
    description: "急上昇ワードから、人々が次に検索する言葉を辿って分析していく。",
  },
  en: {
    title: "Analysis",
    description: "Trace what people search next, out from a rising word.",
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
    alternates: {
      canonical: `/${locale}/analysis`,
      languages: { ja: "/ja/analysis", en: "/en/analysis" },
    },
  };
}

export default function ExplorePage() {
  return <GraphExplorer mode="trends" />;
}
