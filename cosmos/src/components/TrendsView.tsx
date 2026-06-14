"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { GEO_LANG } from "@/lib/trends";
import { t, type Locale } from "@/lib/i18n";
import NewsCarousel from "@/components/NewsCarousel";

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
  const [hint, setHint] = useState<string | null>(null); // 操作ヒント(一瞬)
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ sx: number; sy: number; touch: boolean } | null>(null);
  const moved = useRef(false);
  const pinchPrev = useRef<number | null>(null);
  const midPrev = useRef<{ x: number; y: number } | null>(null); // 2本指の中点(パン用)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const twoFingerHint = locale === "en" ? "Use two fingers to move the map" : "2本指で地図を動かせます";
  const wheelHint = locale === "en" ? "Use ⌘ / Ctrl + scroll to zoom" : "⌘ / Ctrl + スクロールでズーム";
  const showHint = (msg: string) => {
    setHint(msg);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 1400);
  };

  useEffect(() => {
    // クライアントの現在時刻を一度だけ取る(色/発生時刻の基準)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Date.now() / 1000);
    // 全幅突き抜けをやめ「枠(=ページ幅)」の実寸に合わせる。枠の追従はResizeObserverで
    const calc = () => {
      const w = wrapRef.current?.clientWidth ?? Math.min(window.innerWidth, 688);
      const h = Math.min(Math.round(window.innerHeight * 0.62), 560);
      setBox({ w: Math.max(1, w), h });
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", calc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  // ホイールズーム(React onWheelはpassiveでpreventDefault不可なのでネイティブ登録)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // 素のホイール/2本指スクロールはページスクロールに通す。ズームは ⌘/Ctrl + ホイール
      // (Macトラックパッドのピンチは ctrlKey=true で来るのでズームになる)
      if (!(e.ctrlKey || e.metaKey)) {
        showHint(wheelHint);
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);

  // 枠の実寸を測るため、box未確定でも枠自体は描く(=ここでreturnしない)
  type Datum = { children: TrendItem[] } | TrendItem;
  const root = box
    ? pack<Datum>()
        .size([box.w, box.h])
        .padding(6)(
        hierarchy<Datum>({ children: items })
          .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
      )
    : null;

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
  // ボタン用: 枠の中心を基準にズーム / 全体表示に戻す
  const zoomCenter = (factor: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };
  const resetView = () => setView({ x: 0, y: 0, k: 1 });
  const onPointerDown = (e: React.PointerEvent) => {
    // ※ここでは setPointerCapture しない(タップのネイティブclickを潰さないため)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { sx: e.clientX, sy: e.clientY, touch: e.pointerType === "touch" };
      moved.current = false;
    } else {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchPrev.current = Math.hypot(a.x - b.x, a.y - b.y);
      midPrev.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // 2本指: ピンチでズーム + 中点の移動で地図をパン(=「2本指で動かす」)
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinchPrev.current) zoomAt(mid.x, mid.y, d / pinchPrev.current);
      if (midPrev.current) {
        const mdx = mid.x - midPrev.current.x;
        const mdy = mid.y - midPrev.current.y;
        setView((v) => ({ ...v, x: v.x + mdx, y: v.y + mdy }));
      }
      pinchPrev.current = d;
      midPrev.current = mid;
      moved.current = true;
      return;
    }
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    const movedEnough = Math.abs(dx) + Math.abs(dy) > 4;
    if (drag.current.touch) {
      // スマホは1本指でパンしない=縦はページスクロールに通す。
      // 横に動かそうとした時だけ「2本指で」ヒント(縦スクロールでは出さない)
      if (movedEnough && !moved.current) {
        moved.current = true; // 以後タップ扱いにしない
        if (Math.abs(dx) > Math.abs(dy)) showHint(twoFingerHint);
      }
      return;
    }
    // PCはマウスの1ボタンドラッグでパン(スクロールジェスチャではないので奪ってよい)
    if (movedEnough && !moved.current) {
      moved.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (moved.current) setView((v) => ({ ...v, x: v.x + e.movementX, y: v.y + e.movementY }));
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchPrev.current = null;
      midPrev.current = null;
    }
    if (pointers.current.size === 0) drag.current = null;
  };

  return (
    <>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
        {t(locale).bubbles.legend(items.length)}
      </p>
      {/* 他ページと同じ幅(720px)の枠に収める。縦1本指=ページスクロール / 2本指=移動・ズーム */}
      <div
        ref={wrapRef}
        className="bubble-box"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          position: "relative",
          width: "100%",
          height: box?.h ?? 420,
          overflow: "hidden",
          // 縦1本指はページスクロールに通す。地図の移動は2本指/マウスドラッグ、ズームは⌘ホイール
          touchAction: "pan-y",
          userSelect: "none",
          cursor: "grab",
        }}
      >
        {box && root && (
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
        )}

        {/* ズーム操作(枠の右下)。スクロールを奪わない代わりの手段 */}
        <div className="bubble-zoom">
          <button className="btn" onClick={() => zoomCenter(1.3)} aria-label="zoom in">
            +
          </button>
          <button className="btn" onClick={() => zoomCenter(1 / 1.3)} aria-label="zoom out">
            −
          </button>
          <button className="btn" onClick={resetView} aria-label="reset">
            ⤢
          </button>
        </div>

        {/* 操作ヒント(一瞬): スマホ横1本指ドラッグ / PCの素のホイール時 */}
        {hint && <div className="map-hint">{hint}</div>}
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
              <NewsCarousel news={selected.news} translated={newsTr} />
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
