import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import CountryTile from "@/components/CountryTile";
import type { Metadata } from "next";
import { ALLOWED_GEO, GEO_LABELS } from "@/lib/trends";
import { fetchTrendsUnioned } from "@/lib/history";

export const metadata: Metadata = {
  title: "世界のトレンド",
  description:
    "いま各国が検索していること。9カ国の「注意の地図」を並べて眺め、気になった国から、その先のつながりを探索できる。",
};

export const revalidate = 600;

// ホーム = 各国の「注意の地図」一覧。芸術的に並べ、国ごとの詳細(/jp 等)へ降りる入口
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ geo?: string }>;
}) {
  // 旧 /?geo=XX リンクは各国ルートへ転送(SEO/互換)
  const { geo } = await searchParams;
  if (geo && ALLOWED_GEO.has(geo.toUpperCase())) redirect(`/${geo.toLowerCase()}`);

  const geos = Object.keys(GEO_LABELS);
  // 色(新しさ)の基準となる現在時刻。サーバー描画なので一度だけ取得
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  const data = await Promise.all(
    geos.map(async (g) => [g, await fetchTrendsUnioned(g)] as const),
  );

  return (
    <>
      <SiteHeader />
      <main
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "72px 16px 48px",
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            世界のトレンド
          </h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            いま各国が検索していること。気になった国を押すと、その先に何が繋がっているかを探索できる。
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {data.map(([g, items]) => (
            <CountryTile key={g} geo={g} label={GEO_LABELS[g]} items={items} nowSec={nowSec} />
          ))}
        </div>

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          大きさ＝検索ボリューム／色＝新しさ。データ: Google Trends（10分ごと更新）・{" "}
          <Link href="/about" className="muted">
            このサイトについて
          </Link>
        </p>
      </main>
    </>
  );
}
