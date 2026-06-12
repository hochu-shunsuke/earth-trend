import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";

export const revalidate = 600;

const GEO_LABELS: Record<string, string> = {
  JP: "日本",
  US: "アメリカ",
  GB: "イギリス",
  IN: "インド",
  KR: "韓国",
  TW: "台湾",
  DE: "ドイツ",
  FR: "フランス",
  BR: "ブラジル",
};

export default async function ListPage({
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
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          急上昇ワード <span className="muted">— {GEO_LABELS[geo]}</span>
        </h1>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          {Object.keys(GEO_LABELS).map((g) => (
            <Link key={g} href={`/list?geo=${g}`} className="btn" data-active={g === geo}>
              {GEO_LABELS[g]}
            </Link>
          ))}
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
                <span className="muted" style={{ minWidth: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(it.word)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}
                    >
                      {it.word}
                    </a>
                    <span className="muted" style={{ fontSize: 12 }}>
                      検索数 {it.traffic}
                    </span>
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
