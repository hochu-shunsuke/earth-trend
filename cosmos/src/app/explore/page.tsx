"use client";

import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { GEO_LABELS, GEO_HL } from "@/lib/trends";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type ForceLink,
} from "d3-force";

// --- 型 ---

interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

interface TrendItem {
  word: string;
  traffic: string;
  picture?: string;
  news: NewsItem[];
}

interface GNode {
  id: string;
  isTrend: boolean;
  geo: string;
  news: NewsItem[];
  r: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GLink {
  source: string | GNode;
  target: string | GNode;
}

function trendRadius(traffic: string): number {
  const n = parseInt(traffic.replace(/[^0-9]/g, ""), 10) || 0;
  return Math.max(10, Math.log10(n + 1) * 5 + 6);
}

// --- 本体 ---

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // グラフの実体はすべてRefで持ち、Reactの再レンダリングと切り離す
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 }); // screen = world*k + (x,y)
  const sizeRef = useRef({ w: 800, h: 600 });
  const expandedRef = useRef<Set<string>>(new Set());
  const modeRef = useRef<string>("JP");

  // UIパネル用の状態だけReactで
  const [mode, setMode] = useState<string>("JP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    word: string;
    news: NewsItem[];
    isTrend: boolean;
  } | null>(null);

  // シミュレーションへ現在の配列を結び直して再加熱
  const reheat = (alpha: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodesRef.current);
    (sim.force("link") as ForceLink<GNode, GLink>).links(linksRef.current);
    sim.alpha(alpha).restart();
  };

  // トレンド読み込み(指定国)。seed指定時はそのワードを起点に自動で潜る
  const loadTrends = async (geo: string, seed?: string) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    expandedRef.current = new Set();
    const { w, h } = sizeRef.current;

    try {
      const res = await fetch(`/api/trends?geo=${geo}`);
      if (!res.ok) throw new Error(`trends ${res.status}`);
      const data: { items: TrendItem[] } = await res.json();
      nodesRef.current = data.items.map((it) => ({
        id: it.word,
        isTrend: true,
        geo,
        news: it.news,
        r: trendRadius(it.traffic),
        x: w / 2 + (Math.random() - 0.5) * w * 0.35,
        y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      }));
      linksRef.current = [];
      transformRef.current = { x: 0, y: 0, k: 1 };
      reheat(1);
      // 脈拍リストからのダイブ: 起点ワードを自動で選択+連想展開
      if (seed) {
        const seedNode = nodesRef.current.find((n) => n.id === seed);
        if (seedNode) void onNodeHit(seedNode);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  // ノードクリック時: ニュース表示+サジェスト展開
  const onNodeHit = async (node: GNode) => {
    // どの星を押してもパネルを更新する
    setSelected({ word: node.id, news: node.news, isTrend: node.isTrend });

    if (expandedRef.current.has(node.id)) return;
    expandedRef.current.add(node.id);

    const hl = GEO_HL[node.geo] ?? "ja";
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(node.id)}&hl=${hl}`);
      if (!res.ok) return;
      const data: { suggestions: string[] } = await res.json();
      const ids = new Set(nodesRef.current.map((n) => n.id));
      for (const s of data.suggestions) {
        if (!ids.has(s)) {
          ids.add(s);
          nodesRef.current.push({
            id: s,
            isTrend: false,
            geo: node.geo,
            news: [],
            r: 7,
            x: node.x + (Math.random() - 0.5) * 60,
            y: node.y + (Math.random() - 0.5) * 60,
          });
        }
        linksRef.current.push({ source: node.id, target: s });
      }
      reheat(0.7);
    } catch {
      /* サジェスト失敗は無視 */
    }
  };

  // 初期化: canvas・シミュレーション・描画ループ・入力(全部自前)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    sizeRef.current = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const sim = forceSimulation<GNode>([])
      .force("charge", forceManyBody<GNode>().strength(-180))
      .force(
        "link",
        forceLink<GNode, GLink>([]).id((d) => d.id).distance(70).strength(0.6),
      )
      .force("center", forceCenter(w / 2, h / 2).strength(0.05))
      .force("collide", forceCollide<GNode>((n) => n.r + 16))
      .alphaDecay(0.03);
    simRef.current = sim;

    // --- 描画ループ(色はCSS変数から毎フレーム取得=テーマ即時反映) ---
    let raf = 0;
    const draw = () => {
      const css = getComputedStyle(document.documentElement);
      const pal = {
        canvas: css.getPropertyValue("--canvas").trim() || "#0a0a0a",
        trend: css.getPropertyValue("--trend").trim() || "#ff8a3d",
        suggest: css.getPropertyValue("--suggest").trim() || "#52a8ff",
        linkLine: css.getPropertyValue("--link-line").trim() || "rgba(255,255,255,0.16)",
        labelBg: css.getPropertyValue("--label-bg").trim() || "rgba(0,0,0,0.72)",
        labelFg: css.getPropertyValue("--label-fg").trim() || "#ededed",
      };

      const t = transformRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = pal.canvas;
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);

      // リンク
      ctx.strokeStyle = pal.linkLine;
      ctx.lineWidth = 1;
      for (const l of linksRef.current) {
        const s = l.source as GNode;
        const tg = l.target as GNode;
        if (typeof s === "string" || typeof tg === "string") continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tg.x, tg.y);
        ctx.stroke();
      }

      // ノード+ラベル
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const n of nodesRef.current) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.isTrend ? pal.trend : pal.suggest;
        ctx.fill();

        const fontSize = Math.max(11, 12 / t.k);
        ctx.font = `${fontSize}px sans-serif`;
        const tw = ctx.measureText(n.id).width;
        ctx.fillStyle = pal.labelBg;
        ctx.fillRect(n.x - tw / 2 - 2, n.y + n.r + 3, tw + 4, fontSize + 4);
        ctx.fillStyle = pal.labelFg;
        ctx.fillText(n.id, n.x, n.y + n.r + 5);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // --- 入力(自前) ---
    const toWorld = (sx: number, sy: number) => {
      const t = transformRef.current;
      return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k };
    };
    const hitTest = (sx: number, sy: number): GNode | null => {
      const p = toWorld(sx, sy);
      // 後から描いた(上にある)ものを優先
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i];
        const dx = p.x - n.x;
        const dy = p.y - n.y;
        if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n;
      }
      return null;
    };

    // マルチポインタ管理(マウス・タッチ共通)。2本指=ピンチズーム+パン
    const pointers = new Map<number, { x: number; y: number }>();
    let down: { sx: number; sy: number; moved: boolean } | null = null;
    let multiTouched = false;

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        down = { sx: e.offsetX, sy: e.offsetY, moved: false };
        multiTouched = false;
      } else {
        // 2本目が触れたらクリック判定は放棄
        down = null;
        multiTouched = true;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;

      if (pointers.size === 2) {
        // ピンチ: 2点の前回位置から距離比と中点移動を出して適用
        const ids = [...pointers.keys()];
        const otherId = ids[0] === e.pointerId ? ids[1] : ids[0];
        const other = pointers.get(otherId)!;
        const cur = { x: e.offsetX, y: e.offsetY };

        const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y);
        const curDist = Math.hypot(cur.x - other.x, cur.y - other.y);
        const prevMid = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
        const curMid = { x: (cur.x + other.x) / 2, y: (cur.y + other.y) / 2 };

        const t = transformRef.current;
        const factor = prevDist > 0 ? curDist / prevDist : 1;
        const k = Math.min(5, Math.max(0.15, t.k * factor));
        // 前回中点の下にあった世界座標を、新しい中点の下に保つ
        const wx = (prevMid.x - t.x) / t.k;
        const wy = (prevMid.y - t.y) / t.k;
        t.k = k;
        t.x = curMid.x - wx * k;
        t.y = curMid.y - wy * k;

        pointers.set(e.pointerId, cur);
        return;
      }

      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (!down) return;
      const dx = e.offsetX - down.sx;
      const dy = e.offsetY - down.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (down.moved) {
        transformRef.current.x += e.movementX;
        transformRef.current.y += e.movementY;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (down && !down.moved && !multiTouched) {
        const node = hitTest(e.offsetX, e.offsetY);
        if (node) void onNodeHit(node);
      }
      if (pointers.size === 0) down = null;
    };
    const onPointerCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      down = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = transformRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const k = Math.min(5, Math.max(0.15, t.k * factor));
      // カーソル下の点を固定してズーム
      const wx = (e.offsetX - t.x) / t.k;
      const wy = (e.offsetY - t.y) / t.k;
      t.k = k;
      t.x = e.offsetX - wx * k;
      t.y = e.offsetY - wy * k;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // URLの ?geo / ?seed を反映(脈拍リストからのダイブ)
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("geo") || "JP").toUpperCase();
    const geoParam = GEO_LABELS[raw] ? raw : "JP";
    const seedParam = params.get("seed") || undefined;
    setMode(geoParam);
    modeRef.current = geoParam;
    void loadTrends(geoParam, seedParam);

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("wheel", onWheel);
    };
    // マウント時に一度だけ初期化する(意図的)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: string) => {
    setMode(m);
    modeRef.current = m;
    void loadTrends(m);
  };

  // 今見えている宇宙をPNGとして書き出す(シェア装置)
  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);

    // ウォーターマーク(出典がシェアと共に運ばれる)
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stamp = `earth-trend ${modeRef.current} ${new Date().toLocaleDateString()}`;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const tw = ctx.measureText(stamp).width;
    ctx.fillRect(w - tw - 20, h - 26, tw + 12, 20);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(stamp, w - 14, h - 10);

    out.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `earth-trend-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--canvas)" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", cursor: "grab", touchAction: "none" }}
      />

      <SiteHeader overlay />

      {/* コントロール */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        <select
          className="btn"
          value={mode}
          onChange={(e) => switchMode(e.target.value)}
          aria-label="国を選択"
        >
          {Object.entries(GEO_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        {/* JP×US比較はデータの入口が狭く絵が安定しないためv2で再設計(コードとAPIは温存) */}
        <button className="btn" onClick={exportImage}>
          画像で保存
        </button>
        {loading && <span className="muted">Loading...</span>}
        {error && <span style={{ color: "#e5484d" }}>Error: {error}</span>}
      </div>

      {/* 詳細パネル。外枠はクリックを透過させ、裏の星を塞がない */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 12,
            width: 320,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            pointerEvents: "none",
          }}
        >
          <div className="panel" style={{ pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong>{selected.word}</strong>
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
              <ul style={{ paddingLeft: 16, margin: "8px 0" }}>
                {selected.news.map((n, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer">
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                    {n.source && <span className="muted" style={{ fontSize: "0.85em" }}> ({n.source})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              selected.isTrend && (
                <p className="muted" style={{ margin: "8px 0" }}>
                  関連ニュースはまだありません。
                  <br />
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Googleで検索結果を見る →
                  </a>
                </p>
              )
            )}
            {!selected.isTrend && (
              <p style={{ margin: "8px 0" }}>
                <span className="muted">「{selected.word}」は検索者が次に調べている言葉です。</span>
                <br />
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Googleで検索結果を見る →
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
