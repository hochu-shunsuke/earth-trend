"use client";

import { useState } from "react";
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

function parseTraffic(t: string): number {
  // "50,000+" や "5万+" 等。数字だけ拾う(万は概算で桁を足す)
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10) || 0;
  return /万/.test(t) ? n * 10000 : n;
}

// プロト用: リスト / 規模(ビジュアル) をセレクタで切替。装飾は最小・情報設計のみ
export default function TrendsView({ items, geo }: { items: TrendItem[]; geo: string }) {
  const [view, setView] = useState<"list" | "scale">("list");

  const max = Math.max(1, ...items.map((it) => parseTraffic(it.traffic)));

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <select
          className="btn"
          value={view}
          onChange={(e) => setView(e.target.value as "list" | "scale")}
          aria-label="表示"
        >
          <option value="list">リスト</option>
          <option value="scale">規模で見る</option>
        </select>
      </div>

      {view === "list" ? (
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
      ) : (
        // 規模ビュー: 検索ボリュームを文字サイズ+枠で表現。押すとグラフへダイブ
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {items.map((it) => {
            const ratio = parseTraffic(it.traffic) / max; // 0..1
            const fontSize = Math.round(14 + ratio * 26); // 14〜40px
            return (
              <Link
                key={it.word}
                href={`/analysis?geo=${geo}&seed=${encodeURIComponent(it.word)}`}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "10px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--fg)",
                  lineHeight: 1.1,
                }}
              >
                <span style={{ fontSize, fontWeight: 600 }}>{it.word}</span>
                <span className="muted" style={{ fontSize: 11 }}>
                  {it.traffic}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
