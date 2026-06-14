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
  firstSeen?: number; // 最初に観測した時刻(unix秒)。「燃え始め」の近似
  lastSeen?: number;
}

function parseTraffic(t: string): number {
  // "50,000+" や "5万+" 等。数字だけ拾う(万は概算で桁を足す)
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10) || 0;
  return /万/.test(t) ? n * 10000 : n;
}

// 色＝新しさ(発生からの経過)。新しいほど暖色、古いほど寒色。
// サイズ=規模 と直交する2次元目。firstSeen不明時は中立の青
function freshnessColor(firstSeen: number | undefined, nowSec: number): string {
  if (!firstSeen) return "hsl(212 60% 46%)";
  const ageH = Math.max(0, (nowSec - firstSeen) / 3600);
  const t = Math.min(1, ageH / 24); // 0(新しい)..1(24h以上で古い)
  const hue = Math.round(28 + t * (212 - 28)); // 28(暖)→212(寒)
  const light = Math.round(52 - t * 12);
  return `hsl(${hue} 70% ${light}%)`;
}

// 「約X前に登場」(我々が最初に観測した時刻。発生そのものではない点に注意)
function appearedText(firstSeen: number | undefined, nowSec: number): string | null {
  if (!firstSeen) return null;
  const m = Math.max(0, Math.floor((nowSec - firstSeen) / 60));
  if (m < 60) return `約${m}分前に登場`;
  const h = Math.floor(m / 60);
  if (h < 24) return `約${h}時間前に登場`;
  return `約${Math.floor(h / 24)}日前に登場`;
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
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    // クライアントの現在時刻を一度だけ取る(色/発生時刻の基準)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Date.now() / 1000);
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

  return (
    <>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
        大きさ＝検索ボリューム／色＝新しさ（暖色＝最近登場）。直近の急上昇{items.length}件（全検索の割合ではありません）。
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
                background: freshnessColor(it.firstSeen, nowSec),
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
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Date.now() / 1000);
  }, []);

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
            {appearedText(selected.firstSeen, nowSec) && (
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                {appearedText(selected.firstSeen, nowSec)}
              </p>
            )}
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
