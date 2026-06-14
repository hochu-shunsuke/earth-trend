import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeoSelect from "@/components/GeoSelect";
import TrendsView from "@/components/TrendsView";
import { ALLOWED_GEO, GEO_LABELS } from "@/lib/trends";
import { fetchTrendsUnioned } from "@/lib/history";

export const revalidate = 600;

// 9カ国を静的生成(SEO: 各国が独立したインデックス可能ランディング)
export function generateStaticParams() {
  return Object.keys(GEO_LABELS).map((g) => ({ geo: g.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ geo: string }>;
}): Promise<Metadata> {
  const { geo } = await params;
  const label = GEO_LABELS[geo.toUpperCase()];
  if (!label) return {};
  return {
    title: `${label}のトレンド`,
    description: `いま${label}で検索されていること。気になった言葉から、その先に何が繋がっているかを探索できる。`,
    alternates: { canonical: `/${geo.toLowerCase()}` },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ geo: string }>;
}) {
  const { geo } = await params;
  const code = geo.toUpperCase();
  if (!ALLOWED_GEO.has(code)) notFound();

  const items = await fetchTrendsUnioned(code);

  return (
    <>
      <SiteHeader />
      <main
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "72px 16px 48px",
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {GEO_LABELS[code]}のトレンド
            </h1>
            <Link href="/" className="muted" style={{ fontSize: 13 }}>
              ← 一覧
            </Link>
          </div>
          <div style={{ marginTop: 8 }}>
            <GeoSelect geo={code} />
          </div>
        </header>

        {items.length > 0 ? (
          <TrendsView items={items} geo={code} />
        ) : (
          <p className="muted">データの取得に失敗しました。少し待って再読み込みしてください。</p>
        )}
      </main>
    </>
  );
}
