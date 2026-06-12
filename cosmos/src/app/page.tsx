"use client";

import { useEffect, useRef, useState } from "react";
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

type Geo = "JP" | "US";

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
  const geoRef = useRef<Geo>("JP");

  // UIパネル用の状態だけReactで
  const [geo, setGeo] = useState<Geo>("JP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ word: string; news: NewsItem[] } | null>(null);
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  // シミュレーションへ現在の配列を結び直して再加熱
  const reheat = (alpha: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodesRef.current);
    (sim.force("link") as ForceLink<GNode, GLink>).links(linksRef.current);
    sim.alpha(alpha).restart();
  };

  // トレンド読み込み
  const loadTrends = async (g: Geo) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    setLastClicked(null);
    expandedRef.current = new Set();
    try {
      const res = await fetch(`/api/trends?geo=${g}`);
      if (!res.ok) throw new Error(`trends ${res.status}`);
      const data: { items: TrendItem[] } = await res.json();
      const { w, h } = sizeRef.current;
      nodesRef.current = data.items.map((it) => ({
        id: it.word,
        isTrend: true,
        news: it.news,
        r: trendRadius(it.traffic),
        x: w / 2 + (Math.random() - 0.5) * w * 0.6,
        y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      }));
      linksRef.current = [];
      transformRef.current = { x: 0, y: 0, k: 1 };
      reheat(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  // ノードクリック時: ニュース表示+サジェスト展開
  const onNodeHit = async (node: GNode) => {
    setLastClicked(node.id);
    setSelected(node.isTrend && node.news.length > 0 ? { word: node.id, news: node.news } : null);

    if (expandedRef.current.has(node.id)) return;
    expandedRef.current.add(node.id);

    const hl = geoRef.current === "US" ? "en" : "ja";
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

    // --- 描画ループ ---
    let raf = 0;
    const draw = () => {
      const t = transformRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);

      // リンク
      ctx.strokeStyle = "rgba(120,140,200,0.35)";
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
        ctx.fillStyle = n.isTrend ? "#ff6b35" : "#4fc3f7";
        ctx.fill();

        const fontSize = Math.max(11, 12 / t.k);
        ctx.font = `${fontSize}px sans-serif`;
        const tw = ctx.measureText(n.id).width;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(n.x - tw / 2 - 2, n.y + n.r + 3, tw + 4, fontSize + 4);
        ctx.fillStyle = "#fff";
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

    // 初回ロード
    void loadTrends("JP");

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

  const switchGeo = (g: Geo) => {
    setGeo(g);
    geoRef.current = g;
    void loadTrends(g);
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0a1a" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", cursor: "grab", touchAction: "none" }}
      />

      {/* コントロールバー */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          padding: 8,
          display: "flex",
          gap: 8,
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={() => switchGeo("JP")} style={{ fontWeight: geo === "JP" ? "bold" : "normal" }}>
          JP
        </button>
        <button onClick={() => switchGeo("US")} style={{ fontWeight: geo === "US" ? "bold" : "normal" }}>
          US
        </button>
        {loading && <span>Loading...</span>}
        {error && <span style={{ color: "#f66" }}>Error: {error}</span>}
        {lastClicked && <span style={{ color: "#8f8" }}>clicked: {lastClicked}</span>}
      </div>

      {/* ニュースパネル */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 320,
            maxHeight: "80vh",
            overflowY: "auto",
            padding: 8,
            color: "#fff",
            background: "rgba(0,0,0,0.8)",
          }}
        >
          <strong>{selected.word}</strong>
          <ul style={{ paddingLeft: 16 }}>
            {selected.news.map((n, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
                    {n.title}
                  </a>
                ) : (
                  n.title
                )}
                {n.source && <span style={{ color: "#aaa", fontSize: "0.85em" }}> ({n.source})</span>}
              </li>
            ))}
          </ul>
          <button onClick={() => setSelected(null)}>close</button>
        </div>
      )}
    </div>
  );
}
