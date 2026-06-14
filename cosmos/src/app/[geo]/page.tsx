import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeoSelect from "@/components/GeoSelect";
import TrendsView from "@/components/TrendsView";
import { ALLOWED_GEO, GEO_LABELS, GEO_LANG } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";
import { translate } from "@/lib/translate";

type TranslatedItem = RecentTrendItem & { translation?: string };

const UI_LANG = "ja"; // Phase③でロケール連動にする

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

  const raw = await fetchTrendsUnioned(code);
  // 語の翻訳はサーバー描画時に行う(HTMLに原語＋訳が入る=SEO/即時)。Upstashキャッシュで
  // 新規語だけ実翻訳。自国語(src===UI_LANG)は翻訳不要
  const src = GEO_LANG[code] ?? "auto";
  const items: TranslatedItem[] =
    src === UI_LANG
      ? raw
      : await Promise.all(
          raw.map(async (it) => ({
            ...it,
            translation: (await translate(it.word, src, UI_LANG)) ?? undefined,
          })),
        );

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

        {/* サーバー描画のテキスト一覧: 原語＋訳がHTMLに入る=SEO/JS無し/読み上げの土台 */}
        {items.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              {GEO_LABELS[code]}でいま検索されていること
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {items.map((it) => (
                <li
                  key={it.word}
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}
                >
                  <Link href={`/analysis?geo=${code}&seed=${encodeURIComponent(it.word)}`} translate="no">
                    {it.word}
                  </Link>
                  {it.translation && <span className="muted"> — {it.translation}</span>}
                  <span className="muted" style={{ fontSize: 12 }}> ・ 検索数 {it.traffic}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
