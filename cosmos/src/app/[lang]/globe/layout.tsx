import type { Metadata } from "next";
import { toLocale } from "@/lib/i18n";

// globe/page は client component なのでメタはここ(server layout)で出す
const META = {
  ja: {
    title: "地球儀",
    description: "世界の関心を地球儀で俯瞰する。各国の急上昇が新着パルスで灯る。",
  },
  en: {
    title: "Globe",
    description: "See the world's attention on a globe. Each country's risings light up as live pulses.",
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
      canonical: `/${locale}/globe`,
      languages: { ja: "/ja/globe", en: "/en/globe", "x-default": "/en/globe" },
    },
  };
}

export default function GlobeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
