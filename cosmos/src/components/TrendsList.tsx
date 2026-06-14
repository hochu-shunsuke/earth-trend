"use client";

// 旧トレンド「リスト表示」。現在はパック円ビュー(TrendsView)に一本化したため未使用。
// 復活させたくなった時のために保存しておく(import すれば使える)。
import Link from "next/link";

interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}
interface TrendItem {
  word: string;
  traffic: string;
  news: NewsItem[];
}

export default function TrendsList({ items, geo }: { items: TrendItem[]; geo: string }) {
  return (
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
              <Link
                href={`/analysis?geo=${geo}&seed=${encodeURIComponent(it.word)}`}
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
  );
}
