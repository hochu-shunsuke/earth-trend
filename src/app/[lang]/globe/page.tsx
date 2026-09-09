"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import NewsCarousel from "@/components/NewsCarousel";
import { freshnessColor } from "@/lib/trendsVisual";
import { GEO_LANG } from "@/lib/trends";
import { DEFAULT_LOCALE, isLocale, t, localePath, COUNTRY_LABELS } from "@/lib/i18n";

interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

interface TrendItem {
  word: string;
  traffic: string;
  news: NewsItem[];
  firstSeen?: number;
}

interface LabelDatum {
  word: string;
  geo: string;
  lat: number;
  lng: number;
  size: number;
  news: NewsItem[];
  isNew: boolean;
  firstSeen?: number; // 色付け(新しさ)。トレンド/分析と一致
  /** 描画中のHTML要素(可視判定に使う) */
  el?: HTMLElement;
}

// 各国の重心座標
const GEO_CENTER: Record<string, { lat: number; lng: number; label: string }> = {
  JP: { lat: 36.2, lng: 138.2, label: "日本" },
  US: { lat: 39.8, lng: -98.6, label: "アメリカ" },
  GB: { lat: 54.0, lng: -2.0, label: "イギリス" },
  IN: { lat: 22.0, lng: 79.0, label: "インド" },
  KR: { lat: 36.5, lng: 127.8, label: "韓国" },
  TW: { lat: 23.7, lng: 121.0, label: "台湾" },
  DE: { lat: 51.2, lng: 10.4, label: "ドイツ" },
  FR: { lat: 46.6, lng: 2.5, label: "フランス" },
  BR: { lat: -10.8, lng: -52.9, label: "ブラジル" },
};

function parseTraffic(traffic: string): number {
  return parseInt(traffic.replace(/[^0-9]/g, ""), 10) || 0;
}

/** 国の重心の周りに黄金角で散らす */
function scatter(center: { lat: number; lng: number }, i: number) {
  const angle = i * 2.39996; // 黄金角(rad)
  const dist = 1.2 + 1.6 * Math.sqrt(i);
  const lat = center.lat + dist * Math.cos(angle);
  const lng =
    center.lng + (dist * Math.sin(angle)) / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
  return { lat, lng };
}

export default function GlobePage() {
  const pathSeg = usePathname().split("/")[1];
  const locale = isLocale(pathSeg) ? pathSeg : DEFAULT_LOCALE;
  const tx = t(locale);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const prevWordsRef = useRef<Set<string>>(new Set());
  const labelsRef = useRef<LabelDatum[]>([]);
  const [selected, setSelected] = useState<LabelDatum | null>(null);
  const [status, setStatus] = useState(tx.globe.loading);
  const [mounted, setMounted] = useState(false);
  const [panelArmed, setPanelArmed] = useState(true); // 開いた直後の合成クリック対策
  // 選択語/記事の訳(ラベルは/api/trends-all由来で訳を持たない=開いた時に取りこぼし回収)
  const [wordTr, setWordTr] = useState<string | null>(null);
  const [newsTr, setNewsTr] = useState<(string | null)[] | null>(null);
  const countriesRef = useRef<object[] | null>(null);

  // 選択語と記事を国の言語→UIロケールへ翻訳(記事と同じrate-limited経路・自己キャッシュ)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordTr(null);
    setNewsTr(null);
    if (!selected) return;
    const src = GEO_LANG[selected.geo] ?? "auto";
    if (src === locale) return;
    let alive = true;
    fetch(`/api/translate?q=${encodeURIComponent(selected.word)}&from=${src}&to=${locale}`)
      .then((r) => (r.ok ? r.json() : { translated: null }))
      .then((d) => {
        if (alive) setWordTr((d.translated as string | null) ?? null);
      })
      .catch(() => {});
    if (selected.news.length > 0) {
      Promise.all(
        selected.news.slice(0, 3).map((n) =>
          fetch(`/api/translate?q=${encodeURIComponent(n.title)}&from=${src}&to=${locale}`)
            .then((r) => (r.ok ? r.json() : { translated: null }))
            .then((d) => (d.translated as string | null) ?? null)
            .catch(() => null),
        ),
      ).then((res) => {
        if (alive) setNewsTr(res);
      });
    }
    return () => {
      alive = false;
    };
  }, [selected, locale]);

  // globe.glのラベル層(CSS3D)はz-indexを無視して上に描画する。UIをbodyへポータルして確実に前面へ
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // スタイル(リアル/ライン)とテーマに応じて地球の見た目を再適用する
  const applyStyle = useCallback(async () => {
    const globe = globeRef.current;
    if (!globe) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const light = document.documentElement.dataset.theme !== "dark";

    if (!countriesRef.current) {
      try {
        const res = await fetch(
          "https://globe.gl/example/datasets/ne_110m_admin_0_countries.geojson",
        );
        const geo = await res.json();
        countriesRef.current = geo.features ?? [];
      } catch {
        countriesRef.current = [];
      }
    }
    const bg = v("--bg", "#0a0a0a");
    const sphere = light ? "#e9ecf1" : "#161616"; // ライトはうっすい均一グレー(輪郭は出るが主張しない) / ダークは暗い球
    // 大陸は塗らず輪郭線だけ(塗りを球と同色にして線だけ見せる)
    globe
      .showGlobe(true)
      .showAtmosphere(false)
      .backgroundColor(bg)
      .polygonsData(countriesRef.current ?? [])
      .polygonCapColor(() => "rgba(0,0,0,0)")
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => (light ? "#7a7a7a" : "#555555"))
      .polygonAltitude(0.006);
    // 球体は背景に馴染む自発光(照明無視)で、裏側のドット/ラベルを隠すオクルーダー
    const tint = () => {
      const mat = globe.globeMaterial();
      if (!mat) return;
      // color(拡散光)を切る=照明で南北の明るさが変わらず、球全面が均一なグレーになる。
      // 色は emissive(自発光)だけで与える。これで「南半球しか色がつかない」現象を解消。
      mat.color?.set("#000000");
      mat.emissive?.set(sphere);
      mat.specular?.set("#000000");
    };
    tint();
    setTimeout(tint, 250);
    // ラベルを再構築して色をテーマに追従させる
    // (同一オブジェクトだとライブラリが再生成をスキップするためクローンする)
    labelsRef.current = labelsRef.current.map((l) => ({ ...l, el: undefined }));
    globe.htmlElementsData(labelsRef.current);
  }, []);

  useEffect(() => {
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const buildLabels = (data: Record<string, TrendItem[]>): LabelDatum[] => {
      const labels: LabelDatum[] = [];
      const seen = new Set<string>();
      for (const [geo, items] of Object.entries(data)) {
        const center = GEO_CENTER[geo];
        if (!center) continue;
        items.forEach((it, i) => {
          const key = `${geo}:${it.word}`;
          if (seen.has(key)) return;
          seen.add(key);
          const { lat, lng } = scatter(center, i);
          labels.push({
            word: it.word,
            geo,
            lat,
            lng,
            size: Math.max(0.6, Math.log10(parseTraffic(it.traffic) + 1) * 0.45),
            news: it.news,
            firstSeen: it.firstSeen,
            isNew:
              prevWordsRef.current.size > 0 && !prevWordsRef.current.has(key),
          });
        });
      }
      return labels;
    };

    const load = async () => {
      const res = await fetch("/api/trends-all");
      if (!res.ok) {
        setStatus(tx.globe.loadFail);
        return;
      }
      const { data }: { data: Record<string, TrendItem[]> } = await res.json();
      if (disposed || !globeRef.current) return;

      const labels = buildLabels(data);
      labelsRef.current = labels;
      globeRef.current.htmlElementsData(labels);
      // 新着ワードにパルスリングを立てる(ライブ感)
      globeRef.current.ringsData(labels.filter((l) => l.isNew));
      prevWordsRef.current = new Set(
        labels.map((l) => `${l.geo}:${l.word}`),
      );
      setStatus(`${labels.length} trends / ${tx.globe.countries(Object.keys(data).length)}`);
    };

    (async () => {
      const { default: Globe } = await import("globe.gl");
      if (disposed || !containerRef.current) return;

      // applyStyle(国データ取得を待つ非同期)より前に背景色を確定させ、
      // ライトモードでの初期黒フラッシュを防ぐ
      const initialBg =
        getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() ||
        "#0a0a0a";

      const globe = new Globe(containerRef.current)
        .width(window.innerWidth)
        .height(window.innerHeight)
        .backgroundColor(initialBg)
        // 3Dテキストはラテン文字しか描けないため、HTML要素レイヤーで多言語ラベルを描く
        .htmlAltitude(0.012)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .htmlElement((d: any) => {
          const label = d as LabelDatum;
          const el = document.createElement("div");
          el.textContent = label.word;
          // pointer-events: none = テキストの上でもドラッグ/ズームが効く。
          // クリックは画面座標の最近傍探索で解決する(下のonPointerUp)
          const light = document.documentElement.dataset.theme !== "dark";
          // 色=新しさ。明るい球に載るので高彩度+やや濃いめで鮮やか&読める
          const color = light
            ? freshnessColor(label.firstSeen, Date.now() / 1000, -10, 92)
            : freshnessColor(label.firstSeen, Date.now() / 1000);
          // ライトは縁取り無しでOK(明るい球で読める)。ダークは黒系で締める
          const shadow = light ? "none" : "0 0 4px rgba(0,0,0,0.75)";
          el.style.cssText = [
            `font-size: ${Math.round(9 + label.size * 5)}px`,
            "font-weight: 600",
            `color: ${color}`,
            "font-family: sans-serif",
            "white-space: nowrap",
            "pointer-events: none",
            `text-shadow: ${shadow}`,
            "transform: translate(-50%, -50%)",
          ].join(";");
          label.el = el;
          return el;
        })
        .ringColor(() => (t: number) => `rgba(255,140,60,${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(1.2)
        .ringRepeatPeriod(1200)
        .onGlobeReady(() => {
          void applyStyle();
        });

      // 球の素材色を即適用(applyStyle=国データ取得待ちより前に)。これでロード中に既定素材の
      // 「黒い球」が一瞬出るのを防ぐ。色は emissive(自発光)のみ=照明に依らず全面均一。
      {
        const m0 = globe.globeMaterial();
        if (m0) {
          const lt = document.documentElement.dataset.theme !== "dark";
          m0.color?.set("#000000");
          m0.emissive?.set(lt ? "#e9ecf1" : "#161616");
          m0.specular?.set("#000000");
        }
      }

      // 慣性つきの操作感: 投げた方向にすーっと回る
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.25;
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      // 操作中は自動回転を止め、8秒放置で再開
      let resumeTimer: ReturnType<typeof setTimeout> | null = null;
      controls.addEventListener("start", () => {
        controls.autoRotate = false;
        if (resumeTimer) clearTimeout(resumeTimer);
      });
      controls.addEventListener("end", () => {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          controls.autoRotate = true;
        }, 3000);
      });

      globe.pointOfView({ lat: 25, lng: 110, altitude: 2.2 });

      // クリック解決: ドラッグでなければ、クリック地点に最も近い可視ラベルを選ぶ
      const el = containerRef.current;
      let downAt: { x: number; y: number } | null = null;
      el.addEventListener("pointerdown", (e: PointerEvent) => {
        downAt = { x: e.clientX, y: e.clientY };
      });
      el.addEventListener("pointerup", (e: PointerEvent) => {
        if (!downAt) return;
        const moved =
          Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y);
        downAt = null;
        if (moved > 5) return;

        // 当たり判定はラベルの「実際の描画矩形」で行う(文字の全幅+余白が押せる)。
        // 中心点からの距離だと長い単語の端や文字背景分が外れて押しづらかった
        const PAD = 8; // 文字まわりの余白(背景分のクッション)
        let best: LabelDatum | null = null;
        let bestDist = Infinity;
        for (const label of labelsRef.current) {
          const el = label.el;
          // 地球の裏側にあるラベルはthree-globeが非表示にしているので除外
          if (!el || el.style.visibility === "hidden") continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          const inside =
            e.clientX >= r.left - PAD &&
            e.clientX <= r.right + PAD &&
            e.clientY >= r.top - PAD &&
            e.clientY <= r.bottom + PAD;
          if (!inside) continue;
          // 矩形が重なる場合は中心が最も近いものを選ぶ
          const cx = (r.left + r.right) / 2;
          const cy = (r.top + r.bottom) / 2;
          const d = Math.hypot(cx - e.clientX, cy - e.clientY);
          if (d < bestDist) {
            bestDist = d;
            best = label;
          }
        }
        if (best) {
          setSelected(best);
          setPanelArmed(false);
          setTimeout(() => setPanelArmed(true), 350);
          // 選択した語へカメラをすっと寄せる(ズームは保つ)
          const pov = globe.pointOfView();
          globe.pointOfView({ lat: best.lat, lng: best.lng, altitude: pov.altitude }, 700);
        }
      });

      globeRef.current = globe;
      await applyStyle();
      await load();
      interval = setInterval(load, 30 * 60 * 1000); // snapshot間隔に合わせて30分ごとに更新
    })();

    // テーマ切替に追従(ラインスタイルは背景・国土色が変わる)
    const mo = new MutationObserver(() => {
      void applyStyle();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      mo.disconnect();
      globeRef.current?._destructor?.();
      globeRef.current = null;
    };
    // tx はロケール毎に安定(DICT参照)。マウント時一度きりの初期化なので追従不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyStyle]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <div ref={containerRef} />

      <SiteHeader overlay />

      {/* ラベル層(CSS3D)に負けないよう、UIはbodyへポータルして前面に出す */}
      {mounted &&
        createPortal(
          <>
            <div className="canvas-controls" style={{ zIndex: 60 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {status}
              </span>
            </div>

            {selected && (
              <div className="detail-panel" style={{ zIndex: 60 }}>
                <div className="panel" style={{ pointerEvents: panelArmed ? "auto" : "none" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
                  >
                    <span>
                      <strong translate="no">{selected.word}</strong>
                      <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                        {COUNTRY_LABELS[locale][selected.geo] ?? selected.geo}
                      </span>
                    </span>
                    <button
                      className="btn"
                      style={{ padding: "1px 8px" }}
                      onClick={() => setSelected(null)}
                      aria-label={tx.detail.close}
                    >
                      ✕
                    </button>
                  </div>
                  {wordTr && (
                    <div style={{ marginTop: 2, fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>
                      {wordTr}
                    </div>
                  )}
                  {selected.news.length > 0 && (
                    <NewsCarousel news={selected.news} translated={newsTr} />
                  )}
                </div>
              </div>
            )}

            {selected && (
              <div className="dock" style={{ zIndex: 60 }}>
                <span className="word" translate="no">
                  {selected.word}
                </span>
                <a
                  className="btn"
                  href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tx.detail.googleSearch}
                </a>
                <Link
                  className="btn"
                  href={`${localePath(locale, "/analysis")}?geo=${selected.geo}&seed=${encodeURIComponent(selected.word)}`}
                >
                  {tx.detail.explore}
                </Link>
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
