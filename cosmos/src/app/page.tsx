import Link from "next/link";
import GeoSelect from "@/components/GeoSelect";
import SiteHeader from "@/components/SiteHeader";
import TrendsView from "@/components/TrendsView";
import type { Metadata } from "next";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";

export const metadata: Metadata = {
  title: "世界のトレンド",
  description: "いま世界が検索していること。気になった言葉から、その先に何が繋がっているかを探索できる。",
};

export const revalidate = 600;

// ホーム = 世界の「今日の脈拍」。落ち着いて読む surface であり、各トレンドは探索への入口
export default async function PulsePage({
  searchParams,
}: {
  searchParams: Promise<{ geo?: string }>;
}) {
  const params = await searchParams;
  const raw = (params.geo ?? "JP").toUpperCase();
  const geo = ALLOWED_GEO.has(raw) ? raw : "JP";

  let items;
  try {
    items = await fetchTrends(geo);
  } catch {
    items = null;
  }

  return (
    <>
      <SiteHeader />
      {/* ヘッダーはfixedなので、その高さ(48px)ぶん下げる */}
      <main
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          padding: "72px 16px 48px",
          overflowWrap: "anywhere",
        }}
      >
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
            世界のトレンド
          </h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            いま世界が検索していること。気になった言葉を押すと、その先に何が繋がっているかを探索できる。
          </p>
        </header>

        <div style={{ marginBottom: 20 }}>
          <GeoSelect geo={geo} />
        </div>

        {!items && (
          <p className="muted">データの取得に失敗しました。少し待って再読み込みしてください。</p>
        )}

        {items && <TrendsView items={items} geo={geo} />}

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          データ: Google Trends(10分ごと更新) ・{" "}
          <Link href="/about" className="muted">
            このサイトについて
          </Link>
        </p>
      </main>
    </>
  );
}
