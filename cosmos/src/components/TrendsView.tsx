"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor, appearedText } from "@/lib/trendsVisual";

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
  const [view, setView] = useState({ x: 0, y: 0, k: 1 }); // pan/zoom
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ sx: number; sy: number } | null>(null);
  const moved = useRef(false);
  const pinchPrev = useRef<number | null>(null);

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

  // ホイールズーム(React onWheelはpassiveでpreventDefault不可なのでネイティブ登録)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setView((v) => {
        const k = Math.min(6, Math.max(0.5, v.k * factor));
        const rf = k / v.k;
        return { k, x: px - (px - v.x) * rf, y: py - (py - v.y) * rf };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [box]);

  if (!box) return null;

  type Datum = { children: TrendItem[] } | TrendItem;
  const root = pack<Datum>()
    .size([box.w, box.h])
    .padding(6)(
    hierarchy<Datum>({ children: items })
      .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setView((v) => {
      const k = Math.min(6, Math.max(0.5, v.k * factor));
      const rf = k / v.k;
      return { k, x: px - (px - v.x) * rf, y: py - (py - v.y) * rf };
    });
  };
  const onPointerDown = (e: React.PointerEvent) => {
    // ※ここでは setPointerCapture しない(タップのネイティブclickを潰さないため)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { sx: e.clientX, sy: e.clientY };
      moved.current = false;
    } else {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchPrev.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchPrev.current) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchPrev.current);
      pinchPrev.current = d;
      moved.current = true;
      return;
    }
    if (drag.current) {
      if (!moved.current && Math.abs(e.clientX - drag.current.sx) + Math.abs(e.clientY - drag.current.sy) > 4) {
        // ドラッグ開始時だけ捕捉(以降は要素外でも追従。タップは捕捉しないのでclick有効)
        moved.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (moved.current)
        setView((v) => ({ ...v, x: v.x + e.movementX, y: v.y + e.movementY }));
    }
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchPrev.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  return (
    <>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
        大きさ＝検索ボリューム／色＝新しさ（暖色＝最近登場）。直近の急上昇{items.length}件（全検索の割合ではありません）。ドラッグで移動・ホイール/ピンチで拡大。
      </p>
      {/* 中央寄せmainを突き抜けて画面いっぱいに広げる。内側をpan/zoom */}
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          position: "relative",
          width: "100vw",
          left: "50%",
          marginLeft: "-50vw",
          height: box.h,
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          cursor: "grab",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0 0",
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
        >
          {root.leaves().map((leaf) => {
            const it = leaf.data as TrendItem;
            const r = leaf.r;
            // フォントは円半径に完全比例(下限なし)＝ズーム倍率に関係なく常に円に収まる。
            // 表示可否は「画面上の実サイズ(r*k)」で判定し、ズームで小円のラベルも出す
            const fontSize = r * 0.3;
            const showWord = r * view.k > 26;
            const showTraffic = r * view.k > 52;
            return (
              <button
                key={it.word}
                onClick={() => {
                  if (moved.current) return; // ドラッグ後のクリックは無視
                  onSelect(it);
                }}
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
                {showWord && (
                  <span style={{ fontSize, fontWeight: 600, wordBreak: "break-word" }}>
                    {it.word}
                  </span>
                )}
                {showTraffic && (
                  <span style={{ fontSize: fontSize * 0.6, opacity: 0.8 }}>{it.traffic}</span>
                )}
              </button>
            );
          })}
        </div>
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
