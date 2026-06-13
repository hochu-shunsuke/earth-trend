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
  isSeed: boolean; // トレンド語 or 問いの語幹(=展開の起点)。色と大きさに使う
  geo: string; // trends=国コード / mirror=言語コード
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

type Mode = "trends" | "mirror";

function trendRadius(traffic: string): number {
  const n = parseInt(traffic.replace(/[^0-9]/g, ""), 10) || 0;
  return Math.max(10, Math.log10(n + 1) * 5 + 6);
}

// 問いの鏡で使う言語(サジェストのhl)。規定の問いは置かず、ユーザー入力で地図を作る
const MIRROR_LANGS: [string, string][] = [
  ["ja", "日本語"],
  ["en", "English"],
];
const isLang = (v: string) => MIRROR_LANGS.some(([c]) => c === v);

// 危機に関わる補完はグラフに表示しない(暫定パターン)
const CRISIS =
  /(死にたい|自殺|消えたい|リスト?カット|死ぬ方法|死ね|自傷|消えてしまいたい|kill myself|suicide|want to die|end my life|self.?harm|kill me)/i;

// --- 本体 ---

export default function GraphExplorer({ mode }: { mode: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ w: 800, h: 600 });
  const expandedRef = useRef<Set<string>>(new Set());
  const selectRef = useRef<string>(mode === "mirror" ? "ja" : "JP");

  const [sel, setSel] = useState<string>(mode === "mirror" ? "ja" : "JP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false); // mirror: 最初の問いを入れたか
  const [selected, setSelected] = useState<{
    word: string;
    news: NewsItem[];
    isSeed: boolean;
  } | null>(null);

  const reheat = (alpha: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodesRef.current);
    (sim.force("link") as ForceLink<GNode, GLink>).links(linksRef.current);
    sim.alpha(alpha).restart();
  };

  // trends: 指定国のトレンドを読む。seedで自動ダイブ
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
        isSeed: true,
        geo,
        news: it.news,
        r: trendRadius(it.traffic),
        x: w / 2 + (Math.random() - 0.5) * w * 0.35,
        y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      }));
      linksRef.current = [];
      transformRef.current = { x: 0, y: 0, k: 1 };
      reheat(1);
      if (seed) {
        // キャッシュのタイミング差でトレンド一覧にseedが無いことがある。
        // その場合はseedノードを自前で作って必ずダイブできるようにする
        let seedNode = nodesRef.current.find((n) => n.id === seed);
        if (!seedNode) {
          seedNode = {
            id: seed,
            isSeed: true,
            geo,
            news: [],
            r: 13,
            x: w / 2,
            y: h / 2,
          };
          nodesRef.current.push(seedNode);
          reheat(1);
        }
        void onNodeHit(seedNode);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  // mirror: 規定の問いは置かない。ユーザーが入力した問いだけで自分の地図を作る
  const loadStems = async () => {
    setError(null);
    setSelected(null);
    expandedRef.current = new Set();
    nodesRef.current = [];
    linksRef.current = [];
    transformRef.current = { x: 0, y: 0, k: 1 };
    reheat(1);
    setStarted(false);
  };

  const onNodeHit = async (node: GNode) => {
    setSelected({ word: node.id, news: node.news, isSeed: node.isSeed });

    if (expandedRef.current.has(node.id)) return;
    expandedRef.current.add(node.id);

    const hl = mode === "mirror" ? node.geo : GEO_HL[node.geo] ?? "ja";
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(node.id)}&hl=${hl}`);
      if (!res.ok) return;
      const data: { suggestions: string[] } = await res.json();
      // 問いの鏡では危機に関わる補完を除外し、尊厳をもって相談導線に委ねる
      const suggestions =
        mode === "mirror" ? data.suggestions.filter((s) => !CRISIS.test(s)) : data.suggestions;

      const ids = new Set(nodesRef.current.map((n) => n.id));
      for (const s of suggestions) {
        if (!ids.has(s)) {
          ids.add(s);
          nodesRef.current.push({
            id: s,
            isSeed: false,
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
      .force("charge", forceManyBody<GNode>().strength(-120))
      .force("link", forceLink<GNode, GLink>([]).id((d) => d.id).distance(70).strength(0.6))
      .force("center", forceCenter(w / 2, h / 2).strength(0.09))
      .force("collide", forceCollide<GNode>((n) => n.r + 16))
      .alphaDecay(0.03);
    simRef.current = sim;

    let raf = 0;
    const draw = () => {
      const css = getComputedStyle(document.documentElement);
      const pal = {
        canvas: css.getPropertyValue("--canvas").trim() || "#0a0a0a",
        seed: css.getPropertyValue("--trend").trim() || "#ff8a3d",
        leaf: css.getPropertyValue("--suggest").trim() || "#52a8ff",
        linkLine: css.getPropertyValue("--link-line").trim() || "rgba(255,255,255,0.16)",
        labelFg: css.getPropertyValue("--label-fg").trim() || "#ededed",
      };

      const t = transformRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = pal.canvas;
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);

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

      // パス1: ノードの円(常に描く)
      for (const n of nodesRef.current) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.isSeed ? pal.seed : pal.leaf;
        ctx.fill();
      }

      // パス2: ラベル(衝突回避)。親=seedを優先し、重なる末端=leafから順に消す。
      // ズームで離れれば自然に復活する
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const fontSize = Math.max(11, 12 / t.k);
      ctx.font = `${fontSize}px sans-serif`;
      // 背景ボックスは使わず、背景色の細いハロー(縁取り)だけで視認性を確保
      ctx.lineWidth = fontSize * 0.32;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
      const order = [...nodesRef.current].sort(
        (a, b) => (b.isSeed ? 1 : 0) - (a.isSeed ? 1 : 0),
      );
      for (const n of order) {
        const tw = ctx.measureText(n.id).width;
        const bx = n.x - tw / 2 - 2;
        const by = n.y + n.r + 3;
        const box = { x0: bx, y0: by, x1: bx + tw + 4, y1: by + fontSize + 4 };
        const hit = placed.some(
          (q) => !(box.x1 < q.x0 || box.x0 > q.x1 || box.y1 < q.y0 || box.y0 > q.y1),
        );
        // 末端(leaf)が既存ラベルと重なるなら消す。親(seed)は常に表示
        if (hit && !n.isSeed) continue;
        const lx = n.x;
        const ly = n.y + n.r + 5;
        ctx.strokeStyle = pal.canvas;
        ctx.strokeText(n.id, lx, ly);
        ctx.fillStyle = pal.labelFg;
        ctx.fillText(n.id, lx, ly);
        placed.push(box);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const toWorld = (sx: number, sy: number) => {
      const t = transformRef.current;
      return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k };
    };
    const hitTest = (sx: number, sy: number): GNode | null => {
      const p = toWorld(sx, sy);
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i];
        const dx = p.x - n.x;
        const dy = p.y - n.y;
        if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n;
      }
      return null;
    };

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
        down = null;
        multiTouched = true;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      if (pointers.size === 2) {
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

    // 初期化: モードで起点が変わる(URLパラメータ反映の一度きりのsetState)
    const params = new URLSearchParams(window.location.search);
    if (mode === "mirror") {
      const lang = isLang(params.get("lang") ?? "") ? params.get("lang")! : "ja";
      selectRef.current = lang;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSel(lang);
      void loadStems();
    } else {
      const raw = (params.get("geo") || "JP").toUpperCase();
      const geoParam = GEO_LABELS[raw] ? raw : "JP";
      const seedParam = params.get("seed") || undefined;
      selectRef.current = geoParam;
      setSel(geoParam);
      void loadTrends(geoParam, seedParam);
    }

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

  const switchSelect = (v: string) => {
    setSel(v);
    selectRef.current = v;
    if (mode === "mirror") void loadStems();
    else void loadTrends(v);
  };

  // 問いの鏡: 自分の問いを起点に潜る(personal stake)
  const addQuestion = (raw: string) => {
    const text = raw.trim().slice(0, 60);
    if (!text) return;
    setInput("");
    setStarted(true);
    let node = nodesRef.current.find((n) => n.id === text);
    if (!node) {
      const { w, h } = sizeRef.current;
      const t = transformRef.current;
      node = {
        id: text,
        isSeed: true,
        geo: selectRef.current,
        news: [],
        r: 13,
        x: (w / 2 - t.x) / t.k,
        y: (h / 2 - t.y) / t.k,
      };
      nodesRef.current.push(node);
      reheat(0.8);
    }
    void onNodeHit(node);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stamp =
      mode === "mirror"
        ? `earth-trend ・ 世界の問い ・ ${new Date().toLocaleDateString()}`
        : `earth-trend ${selectRef.current} ${new Date().toLocaleDateString()}`;
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

  const options = mode === "mirror" ? MIRROR_LANGS : Object.entries(GEO_LABELS);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--canvas)" }}>
      <canvas ref={canvasRef} style={{ display: "block", cursor: "grab", touchAction: "none" }} />

      {/* 問いの鏡: まだ何も入れていないときの導き(規定の問いは置かない) */}
      {mode === "mirror" && !started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            padding: 16,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 20, fontWeight: 600 }}>問いを見つける</p>
          <p className="muted" style={{ maxWidth: 460 }}>
            あなたの問いを入力すると、世界の検索がその続きを広げていく。
            <br />
            気になる問いをいくつも入れて、自分の地図を作ってみよう。
          </p>
        </div>
      )}

      <SiteHeader overlay />

      <div className="canvas-controls">
        <select
          className="btn"
          value={sel}
          onChange={(e) => switchSelect(e.target.value)}
          aria-label={mode === "mirror" ? "言語を選択" : "国を選択"}
        >
          {options.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={exportImage}>
          画像で保存
        </button>
        {loading && <span className="muted">Loading...</span>}
        {error && <span style={{ color: "#e5484d" }}>Error: {error}</span>}
      </div>

      {selected && (
        <div className="detail-panel">
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
              <ul style={{ paddingLeft: 16, margin: "8px 0 0" }}>
                {selected.news.map((n, i) => (
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
                {mode === "mirror"
                  ? "世界が実際に検索している言葉。"
                  : "検索者が次に調べている言葉。"}
              </p>
            )}

            {/* 探求(mirror)はドックが入力欄なので、選択語のGoogle検索はここに置いて対象を明確にする */}
            {mode === "mirror" && (
              <a
                className="btn"
                style={{ display: "inline-block", marginTop: 10 }}
                href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                「{selected.word}」をGoogleで検索
              </a>
            )}
          </div>
        </div>
      )}

      {/* 画面下部中央のドック: 探求=問いの入力に専念 / 分析=選択語のアクション */}
      {mode === "mirror" ? (
        <form
          className="dock"
          onSubmit={(e) => {
            e.preventDefault();
            addQuestion(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={sel === "en" ? "ask your own… (e.g. why am i)" : "問いを入力…（例: なぜ私は）"}
            aria-label="問いを入力"
          />
          <button className="btn" type="submit">
            潜る
          </button>
        </form>
      ) : (
        selected && (
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
          </div>
        )
      )}
    </div>
  );
}
