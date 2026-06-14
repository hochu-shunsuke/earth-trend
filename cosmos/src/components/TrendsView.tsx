"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { GEO_LANG } from "@/lib/trends";
import { t, type Locale } from "@/lib/i18n";

// 「登場からの経過」をロケール別の短い文字列に
function durationStr(sec: number | undefined, nowSec: number, locale: Locale): string | null {
  if (!sec) return null;
  const m = Math.max(0, Math.floor((nowSec - sec) / 60));
  const h = Math.floor(m / 60);
  if (locale === "en") {
    if (m < 60) return `${m} min`;
    if (h < 24) return `${h} hr`;
    return `${Math.floor(h / 24)} days`;
  }
  if (m < 60) return `${m}分`;
  if (h < 24) return `${h}時間`;
  return `${Math.floor(h / 24)}日`;
}

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
  translation?: string; // 語の訳(サーバー描画で付与。原語は常に残す)
}

// 規模ビュー(パック円): 円の面積=検索ボリューム。隙間が残る=「これが全部ではない」
// を暗に示す(急上昇トップNのみで、全検索の割合ではない)。ツリーマップは割合の
// 偽の全体性を主張するため不採用(検索データに part-to-whole は無い)。
function ScaleBubbles({
  items,
  locale,
  onSelect,
}: {
  items: TrendItem[];
  locale: Locale;
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
        {t(locale).bubbles.legend(items.length)}
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
          // 縦スワイプはページスクロールに通す(地図が画面を占有してスクロール不能になるのを解消)。
          // 横ドラッグ/ピンチは地図側で拾う
          touchAction: "pan-y",
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
                  <span translate="no" style={{ fontSize, fontWeight: 600, wordBreak: "break-word" }}>
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
export default function TrendsView({
  items,
  geo,
  locale,
}: {
  items: TrendItem[];
  geo: string;
  locale: Locale;
}) {
  const d = t(locale);
  const [selected, setSelected] = useState<TrendItem | null>(null);
  const [nowSec, setNowSec] = useState(0);
  // ニュースの翻訳(語はサーバー描画で it.translation 済み。ニュースだけ開いた時に取る)
  const [newsTr, setNewsTr] = useState<(string | null)[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Date.now() / 1000);
  }, []);

  const srcLang = GEO_LANG[geo] ?? "auto";
  const canTranslate = srcLang !== locale; // 自国語なら翻訳不要

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewsTr(null);
    if (!selected || !canTranslate || selected.news.length === 0) return;
    let cancelled = false;
    (async () => {
      const news = await Promise.all(
        selected.news.slice(0, 3).map(async (n) => {
          try {
            const r = await fetch(
              `/api/translate?q=${encodeURIComponent(n.title)}&from=${encodeURIComponent(srcLang)}&to=${locale}`,
            );
            return ((await r.json()) as { translated: string | null }).translated;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) setNewsTr(news);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, srcLang, canTranslate, locale]);

  const appeared = selected ? durationStr(selected.firstSeen, nowSec, locale) : null;

  return (
    <>
      <ScaleBubbles items={items} locale={locale} onSelect={setSelected} />

      {selected && (
        <div className="detail-panel">
          <div className="panel" style={{ pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>
                {/* 原語は常に残す(translate=noでブラウザ翻訳でも保護) */}
                <strong translate="no">{selected.word}</strong>
                {selected.translation && (
                  <span style={{ marginLeft: 6, fontSize: 13 }}>→ {selected.translation}</span>
                )}
                <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                  {d.detail.searches} {selected.traffic}
                </span>
              </span>
              <button
                className="btn"
                style={{ padding: "1px 8px" }}
                onClick={() => setSelected(null)}
                aria-label={d.detail.close}
              >
                ✕
              </button>
            </div>
            {appeared && (
              <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
                {d.detail.appeared(appeared)}
              </p>
            )}
            {selected.news.length > 0 ? (
              // 記事は横スワイプのスライドにしてコンパクトに(各スライドは数行でクランプ)
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  margin: "8px -2px 0",
                  padding: "0 2px 4px",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {selected.news.slice(0, 3).map((n, i) => {
                  const title = newsTr?.[i] ?? n.title; // 訳があれば訳、無ければ原文
                  // URLが無い(旧データ)はGoogleニュース検索にフォールバック＝必ずリンク
                  const href = n.url ?? `https://www.google.com/search?q=${encodeURIComponent(n.title)}`;
                  return (
                    <a
                      key={i}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={n.title}
                      style={{
                        flex: selected.news.length > 1 ? "0 0 86%" : "0 0 100%",
                        scrollSnapAlign: "start",
                        fontSize: 13,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {title}
                      {n.source && (
                        <span className="muted" style={{ fontSize: "0.85em" }}>
                          {" "}
                          ({n.source})
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ margin: "8px 0 0" }}>
                {d.detail.trendingNow}
              </p>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="dock">
          <span className="word" translate="no">{selected.word}</span>
          <a
            className="btn"
            href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {d.detail.googleSearch}
          </a>
          <Link
            className="btn"
            href={`/${locale}/analysis?geo=${geo}&seed=${encodeURIComponent(selected.word)}`}
          >
            {d.detail.explore}
          </Link>
        </div>
      )}
    </>
  );
}
