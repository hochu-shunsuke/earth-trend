import Link from "next/link";
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
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <Link href="/">← グラフで見る</Link>
      </nav>

      <h1>急上昇ワード — {GEO_LABELS[geo]}</h1>

      <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {Object.keys(GEO_LABELS).map((g) => (
          <Link
            key={g}
            href={`/list?geo=${g}`}
            style={{ fontWeight: g === geo ? "bold" : "normal" }}
          >
            {GEO_LABELS[g]}
          </Link>
        ))}
      </p>

      {!items && <p>データの取得に失敗しました。少し待って再読み込みしてください。</p>}

      {items && (
        <ol style={{ paddingLeft: 28 }}>
          {items.map((it) => (
            <li key={it.word} style={{ marginBottom: 18 }}>
              <div>
                <strong style={{ fontSize: "1.1em" }}>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(it.word)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {it.word}
                  </a>
                </strong>{" "}
                <span>検索数 {it.traffic}</span>
              </div>
              {it.news.length > 0 && (
                <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                  {it.news.slice(0, 2).map((n, i) => (
                    <li key={i}>
                      {n.url ? (
                        <a href={n.url} target="_blank" rel="noopener noreferrer">
                          {n.title}
                        </a>
                      ) : (
                        n.title
                      )}
                      {n.source && <span> ({n.source})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      <p style={{ marginTop: 24, fontSize: "0.85em" }}>
        データ: Google Trends(10分ごと更新) / earth-trend
      </p>
    </main>
  );
}
