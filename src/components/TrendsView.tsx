"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { GEO_LANG } from "@/lib/trends";
import { t, localePath, durationStr, COUNTRY_LABELS, type Locale } from "@/lib/i18n";
import NewsCarousel from "@/components/NewsCarousel";
import LiveStamp from "@/components/LiveStamp";
import NewsTitle from "@/components/NewsTitle";
import WordGloss from "@/components/WordGloss";

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
  const [ctrlShown, setCtrlShown] = useState(true); // ズームボタン: 操作後しばらくでフェードアウト
  const ctrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ sx: number; sy: number; touch: boolean } | null>(null);
  const moved = useRef(false);
  const pinchPrev = useRef<number | null>(null);
  const midPrev = useRef<{ x: number; y: number } | null>(null); // 2本指の中点(パン用)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const twoFingerHint =
    locale === "ja"
      ? "2本指で地図を動かせます"
      : locale === "es"
        ? "Usa dos dedos para mover el mapa"
        : "Use two fingers to move the map";
  const wheelHint =
    locale === "ja"
      ? "⌘ / Ctrl + スクロールでズーム"
      : locale === "es"
        ? "⌘ / Ctrl + scroll para acercar"
        : "Use ⌘ / Ctrl + scroll to zoom";
  const showHint = (msg: string) => {
    setHint(msg);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 1400);
  };
  // 触っている間だけズームボタンを見せ、2.5秒なにもなければ静かに消す(見た目重視)
  const pokeControls = () => {
    setCtrlShown((s) => (s ? s : true)); // 表示中なら再レンダーしない(連続move対策)
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setCtrlShown(false), 2500);
  };

  useEffect(() => {
    // クライアントの現在時刻を一度だけ取る(色/発生時刻の基準)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Date.now() / 1000);
    // 全幅突き抜けをやめ「枠(=ページ幅)」の実寸に合わせる。枠の追従はResizeObserverで
    const calc = () => {
      const w = wrapRef.current?.clientWidth ?? window.innerWidth;
      const h = Math.min(Math.round(window.innerHeight * 0.68), 680);
      setBox({ w: Math.max(1, w), h });
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", calc);
    // 初期は見せて、操作が無ければ2.5秒で静かに消す
    ctrlTimer.current = setTimeout(() => setCtrlShown(false), 2500);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    };
  }, []);

  // ホイールズーム(React onWheelはpassiveでpreventDefault不可なのでネイティブ登録)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      pokeControls();
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
    pokeControls();
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
    pokeControls();
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
      {/* 中央寄せmainを突き抜けて画面いっぱいに広げる(最大幅)。操作は方式で分離 */}
      <div
        ref={wrapRef}
        className="bubble-box"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{
          position: "relative",
          width: "100vw",
          left: "50%",
          marginLeft: "-50vw",
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
            {root.leaves().map((leaf, i) => {
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
                className="bubble-pop"
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
                  animationDelay: `${i * 0.02}s`,
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

        {/* ズーム操作(枠の右下)。操作後しばらくでフェードアウト */}
        <div
          className="bubble-zoom"
          style={{ opacity: ctrlShown ? 1 : 0, pointerEvents: ctrlShown ? "auto" : "none" }}
        >
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
// (地球儀ページと同じ操作感)。
export default function TrendsView({
  items,
  geo,
  locale,
  nowSec: nowSecInit,
}: {
  items: TrendItem[];
  geo: string;
  locale: Locale;
  nowSec: number; // サーバー時刻(秒)。リストの「経過」表示をSSRから正しく出すための基準
}) {
  const d = t(locale);
  const [selected, setSelected] = useState<TrendItem | null>(null);
  // サーバー時刻で初期化=SSRと一致(ハイドレーション差異なし)。effectでクライアント時刻に更新
  const [nowSec, setNowSec] = useState(nowSecInit);
  // 着地時に図を最新へ更新。ISRのHTMLが古くても、アクセス時にCDNキャッシュ済みの最新図へ
  // 置き換える(=「リロードしないと古い」を解消)。/api/trendsはUpstash+CDNで上流は叩かない。
  // 下のSEO一覧はSSRのまま=インデックスの土台は維持(別物として扱う)。
  const [liveItems, setLiveItems] = useState(items);
  useEffect(() => {
    let alive = true;
    fetch(`/api/trends?geo=${geo}&to=${locale}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.items?.length) setLiveItems(data.items as TrendItem[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [geo, locale]);
  // ニュースの翻訳(語はサーバー描画で it.translation 済み。ニュースだけ開いた時に取る)
  const [newsTr, setNewsTr] = useState<(string | null)[] | null>(null);
  // 選択語の訳。SSR(it.translation)が温済なら即出す。未温なら開いた時に取りこぼし回収(self-cache)
  const [selWordTr, setSelWordTr] = useState<string | null>(null);
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

  // 選択語の訳: SSRに無ければライブで回収(記事と同じrate-limited経路・自己キャッシュ)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelWordTr(null);
    if (!selected || selected.translation || !canTranslate) return;
    let alive = true;
    fetch(`/api/translate?q=${encodeURIComponent(selected.word)}&from=${encodeURIComponent(srcLang)}&to=${locale}`)
      .then((r) => (r.ok ? r.json() : { translated: null }))
      .then((d) => {
        if (alive) setSelWordTr((d.translated as string | null) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selected, srcLang, canTranslate, locale]);

  const appeared = selected ? durationStr(selected.firstSeen, nowSec, locale) : null;
  const selGloss = selected?.translation ?? selWordTr;

  // 図と同じ liveItems からリストも描く=「図だけ新しくリストが古い」を解消。
  // SSRは初期state(items)で描かれる=クローラ/JS無し向けSEO土台は維持(初期HTMLに原語＋訳＋ニュース)。
  const country = COUNTRY_LABELS[locale][geo];
  // 「最終更新」は最新スナップのlastSeen=鮮度に正直(描画時刻ではない)
  const updatedSec = liveItems.reduce((mx, it) => Math.max(mx, it.lastSeen ?? 0), 0);

  return (
    <>
      <ScaleBubbles items={liveItems} locale={locale} onSelect={setSelected} />

      {selected && (
        <div className="detail-panel">
          <div className="panel" style={{ pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>
                {/* 原語は常に残す(translate=noでブラウザ翻訳でも保護) */}
                <strong translate="no">{selected.word}</strong>
                {selGloss && (
                  <span style={{ marginLeft: 6, fontSize: 13 }}>→ {selGloss}</span>
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
            href={`${localePath(locale, "/analysis")}?geo=${geo}&seed=${encodeURIComponent(selected.word)}`}
          >
            {d.detail.explore}
          </Link>
        </div>
      )}

      {/* サーバー描画のテキスト一覧(SEO土台)。図と同じ liveItems を参照=同じ瞬間に更新される */}
      {liveItems.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{d.country.seoHeading(country)}</h2>
          <p style={{ margin: "4px 0 0" }}>
            <LiveStamp
              iso={new Date((updatedSec || nowSec) * 1000).toISOString()}
              locale={locale}
              label={d.country.updated}
            />
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
            {liveItems.map((it) => (
              <li
                key={it.word}
                style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}
              >
                <Link
                  href={`${localePath(locale, "/analysis")}?geo=${geo}&seed=${encodeURIComponent(it.word)}`}
                  translate="no"
                  style={{ fontWeight: 600 }}
                >
                  {it.word}
                </Link>
                <WordGloss word={it.word} from={srcLang} to={locale} initial={it.translation} />
                <span className="muted" style={{ fontSize: 12 }}>
                  {" "}
                  ・ {d.detail.searches} {it.traffic}
                  {it.firstSeen &&
                    ` ・ ${d.detail.appeared(durationStr(it.firstSeen, nowSec, locale) ?? "")}`}
                </span>
                {/* なぜ流行ってるか=ニュース見出しをHTMLテキストで(SEO=語彙/文脈/独自性) */}
                {it.news.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
                    {it.news.slice(0, 2).map((n, i) => (
                      <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
                        {n.url ? (
                          <a href={n.url} target="_blank" rel="noopener nofollow" className="muted">
                            <NewsTitle title={n.title} from={srcLang} to={locale} />
                          </a>
                        ) : (
                          <NewsTitle title={n.title} from={srcLang} to={locale} />
                        )}
                        {n.source && <span> ({n.source})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
