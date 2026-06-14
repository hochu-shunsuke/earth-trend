"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";

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

// 規模ビュー(パック円): 円の面積=検索ボリューム。隙間が残る=「これが全部ではない」
// を暗に示す(急上昇トップNのみで、全検索の割合ではない)。ツリーマップは割合の
// 偽の全体性を主張するため不採用(検索データに part-to-whole は無い)。
function ScaleBubbles({
  items,
  onSelect,
}: {
  items: TrendItem[];
  onSelect: (it: TrendItem) => void;
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const calc = () =>
      setBox({ w: window.innerWidth, h: Math.min(Math.round(window.innerHeight * 0.7), 720) });
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  if (!box) return null;

  type Datum = { children: TrendItem[] } | TrendItem;
  const root = pack<Datum>()
    .size([box.w, box.h])
    .padding(6)(
    hierarchy<Datum>({ children: items })
      .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  const maxV = root.value || 1;

  return (
    <>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
        円の大きさ＝検索ボリューム。表示は急上昇トップ{items.length}件のみ（全検索の割合ではありません）。
      </p>
      {/* 中央寄せmainを突き抜けて画面いっぱいに広げる */}
      <div
        style={{
          position: "relative",
          width: "100vw",
          left: "50%",
          marginLeft: "-50vw",
          height: box.h,
        }}
      >
        {root.leaves().map((leaf) => {
          const it = leaf.data as TrendItem;
          const r = leaf.r;
          const ratio = (leaf.value ?? 0) / maxV; // 0..1
          const light = 32 + Math.round(ratio * 26); // 大きいほど明るい単色青
          const fontSize = Math.max(10, Math.min(28, Math.round(r * 0.34)));
          const show = r > 26; // 小さい円は文字を出さない(タップで分かる)
          return (
            <button
              key={it.word}
              onClick={() => onSelect(it)}
              title={`${it.word} ・ ${it.traffic}`}
              style={{
                position: "absolute",
                left: leaf.x - r,
                top: leaf.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: `hsl(212 68% ${light}%)`,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 6,
                overflow: "hidden",
                lineHeight: 1.1,
              }}
            >
              {show && (
                <>
                  <span style={{ fontSize, fontWeight: 600, wordBreak: "break-word" }}>
                    {it.word}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>{it.traffic}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// トレンドページ本体: パック円で規模を見せ、タップで詳細(記事+検索+探索)を出す
// (地球儀ページと同じ操作感)。旧リスト表示は TrendsList.tsx に退避(未使用)。
export default function TrendsView({ items, geo }: { items: TrendItem[]; geo: string }) {
  const [selected, setSelected] = useState<TrendItem | null>(null);

  return (
    <>
      <ScaleBubbles items={items} onSelect={setSelected} />

      {selected && (
        <div className="detail-panel">
          <div className="panel" style={{ pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>
                <strong>{selected.word}</strong>
                <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                  検索数 {selected.traffic}
                </span>
              </span>
              <button
                className="btn"
                style={{ padding: "1px 8px" }}
                onClick={() => setSelected(null)}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            {selected.news.length > 0 ? (
              <ul style={{ paddingLeft: 16, margin: "8px 0 0" }}>
                {selected.news.slice(0, 3).map((n, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer">
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                    {n.source && (
                      <span className="muted" style={{ fontSize: "0.85em" }}>
                        {" "}
                        ({n.source})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: "8px 0 0" }}>
                いま急上昇している検索。
              </p>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="dock">
          <span className="word">{selected.word}</span>
          <a
            className="btn"
            href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Googleで検索
          </a>
          <Link
            className="btn"
            href={`/analysis?geo=${geo}&seed=${encodeURIComponent(selected.word)}`}
          >
            探索する
          </Link>
        </div>
      )}
    </>
  );
}
