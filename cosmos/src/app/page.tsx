import Link from "next/link";
import GeoSelect from "@/components/GeoSelect";
import SiteHeader from "@/components/SiteHeader";
import type { Metadata } from "next";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";

export const metadata: Metadata = {
  title: "世界の脈拍",
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
            世界の脈拍
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

        {items && (
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((it, idx) => (
              <li
                key={it.word}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span
                  className="muted"
                  style={{ minWidth: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    {/* ワード = 探索へのダイブ(脈拍→潜る) */}
                    <Link
                      href={`/explore?geo=${geo}&seed=${encodeURIComponent(it.word)}`}
                      style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}
                    >
                      {it.word}
                    </Link>
                    <span className="muted" style={{ fontSize: 12 }}>
                      検索数 {it.traffic}
                    </span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(it.word)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="muted"
                      style={{ fontSize: 12 }}
                    >
                      検索 ↗
                    </a>
                  </div>
                  {it.news.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
                      {it.news.slice(0, 2).map((n, i) => (
                        <li key={i} style={{ fontSize: 13, marginTop: 2 }}>
                          {n.url ? (
                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="muted">
                              {n.title}
                            </a>
                          ) : (
                            <span className="muted">{n.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          データ: Google Trends(10分ごと更新)
        </p>
      </main>
    </>
  );
}
