"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import NewsCarousel from "@/components/NewsCarousel";
import { GEO_LABELS, GEO_HL, GEO_LANG } from "@/lib/trends";
import { freshnessColor } from "@/lib/trendsVisual";
import { DEFAULT_LOCALE, isLocale, t, COUNTRY_LABELS } from "@/lib/i18n";
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
  firstSeen?: number; // 我々が最初に観測した時刻。色付け(新しさ)に使う=トレンドページと一致
}

interface GNode {
  id: string;
  isSeed: boolean; // トレンド語 or 問いの語幹(=展開の起点)。色と大きさに使う
  geo: string; // trends=国コード / mirror=言語コード
  news: NewsItem[];
  firstSeen?: number; // seedの「燃え始め」近似。色付け(新しさ)に使う
  bornAt?: number; // 出現時刻(ms)。半径を0→フルにスケールインさせる出生アニメ用
  depth?: number; // 階層の深さ(seed=0, その子=1, 孫=2…)。ズーム倍率で表示段階を制御
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

// ズーム倍率 k に応じて深さ depth の「ラベル(文字)」をどれだけ見せるか(0=非表示 / 1=完全表示)。
// ノードの円自体は常に表示。文字だけを段階化する: 初期の引き(=100%)では親(depth0)の文字だけ、
// ズームインで子→孫…の文字が順にフェードイン。k は最大5なので拡大しきれば全部の文字が出る。
const K_THRESH = [0, 1.3, 2.2, 3.1, 4.0, 4.8]; // depthごとの「出現開始」ズーム
function depthAlpha(depth: number, k: number): number {
  if (depth <= 0) return 1;
  const start = K_THRESH[Math.min(depth, K_THRESH.length - 1)];
  return Math.max(0, Math.min(1, (k - start) / 0.6)); // 0.6幅でじわっとフェードイン
}

// --- 本体: 分析(トレンド語→サジェストの連想グラフ) ---

export default function GraphExplorer() {
  const pathSeg = usePathname().split("/")[1];
  const locale = isLocale(pathSeg) ? pathSeg : DEFAULT_LOCALE;
  const tx = t(locale);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ w: 800, h: 600 });
  const expandedRef = useRef<Set<string>>(new Set());
  const selectRef = useRef<string>("JP");
  // カメラのトゥイーン(時間ベースのease-in-out)。固定の目標へ緩やかに寄せる。
  // 整定済みの座標に対して動かすので、追従式のような「忙しい/急加速」が出ない
  const camTweenRef = useRef<{
    from: { x: number; y: number; k: number };
    to: { x: number; y: number; k: number };
    start: number;
    dur: number;
  } | null>(null);
  // 「俯瞰→ダイブ」の二段カメラ用タイマー(新規ロード/アンマウントで破棄)
  const diveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // マウント世代。StrictMode等で前マウントの非同期loadTrendsが現状態を汚すのを防ぐガード
  const genRef = useRef(0);
  // 詳細パネルの実DOM矩形を読んで、フィット時にその領域を避ける(隠れ防止)
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelCamera = () => {
    camTweenRef.current = null;
  };

  // 目標の画角(transform)を計算する純関数。focus指定でそのノード+隣接に寄る。
  // ヘッダー/詳細パネル/ドックに隠れない可視領域へ収める
  const computeFitTarget = (focusId: string | null) => {
    let ns = nodesRef.current;
    if (focusId) {
      const ids = new Set<string>([focusId]);
      for (const l of linksRef.current) {
        const s = typeof l.source === "string" ? l.source : (l.source as GNode).id;
        const t = typeof l.target === "string" ? l.target : (l.target as GNode).id;
        if (s === focusId) ids.add(t);
        if (t === focusId) ids.add(s);
      }
      const sub = nodesRef.current.filter((n) => ids.has(n.id));
      if (sub.length > 0) ns = sub;
    }
    if (ns.length === 0) return null;
    const { w, h } = sizeRef.current;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of ns) {
      if (n.x - n.r < minX) minX = n.x - n.r;
      if (n.x + n.r > maxX) maxX = n.x + n.r;
      if (n.y - n.r < minY) minY = n.y - n.r;
      if (n.y + n.r > maxY) maxY = n.y + n.r;
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const mobile = w < 560;
    const top = mobile ? 96 : 64;
    let right = 12;
    let bottom = mobile ? 32 : 28;
    const left = 12;
    const pr = panelRef.current?.getBoundingClientRect();
    if (pr && pr.width > 0) {
      if (mobile) bottom = Math.max(bottom, h - pr.top + 10);
      else right = Math.max(right, w - pr.left + 12);
    }
    const availW = Math.max(60, w - left - right);
    const availH = Math.max(60, h - top - bottom);
    const k = Math.min(2.2, Math.max(0.2, Math.min(availW / bw, availH / bh) * 0.82));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const vcx = left + availW / 2;
    const vcy = top + availH / 2;
    return { k, x: vcx - cx * k, y: vcy - cy * k };
  };

  // シミュレーションを同期で進めて整定させる(着地時のズームイン→アウトの忙しさを断つ)
  const settleSim = (ticks: number) => {
    const sim = simRef.current;
    if (!sim) return;
    for (let i = 0; i < ticks; i++) sim.tick();
  };

  // 即座にスナップ(アニメ無し)。整定後の俯瞰を「最初から引きで」見せる用
  const snapTo = (focusId: string | null) => {
    const to = computeFitTarget(focusId);
    if (to) transformRef.current = to;
  };

  // 固定目標へease-in-outで寄せる(急加速しない)。対象は整定後に計算する
  const tweenTo = (focusId: string | null, dur = 1300) => {
    const to = computeFitTarget(focusId);
    if (!to) return;
    camTweenRef.current = { from: { ...transformRef.current }, to, start: performance.now(), dur };
  };

  const [sel, setSel] = useState<string>("JP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    word: string;
    geo: string;
    news: NewsItem[];
    isSeed: boolean;
  } | null>(null);
  // 選択語のニュース見出しの訳(海外記事の日本語/英語訳が欲しい需要)。analysisはクライアント
  // 描画=非SEO面なので翻訳公開のスパムリスクは無い。原語は保持しhoverで原文を出す。
  const [newsTr, setNewsTr] = useState<(string | null)[] | null>(null);
  // 選択語そのものの訳(ノードは/api/trends由来で訳を持たないので開いた時に取りこぼし回収)
  const [wordTr, setWordTr] = useState<string | null>(null);
  // パネルを開いた直後は非インタラクティブに(タップの合成クリックがリンクに当たって飛ぶのを防ぐ)
  const [panelArmed, setPanelArmed] = useState(true);

  const reheat = (alpha: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.nodes(nodesRef.current);
    (sim.force("link") as ForceLink<GNode, GLink>).links(linksRef.current);
    sim.alpha(alpha).restart();
  };

  // 選択語が変わるたび、その国の言語→UIロケールへニュース見出しを翻訳(訳は全段キャッシュ済)。
  // 同言語なら何もしない。原語は保持され、訳が来るまでは原文を表示。
  useEffect(() => {
    // 選択が変わったら前の訳を即クリア(古い訳が一瞬残らない)。意図的な同期リセット
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewsTr(null);
    if (!selected || selected.news.length === 0) return;
    const src = GEO_LANG[selected.geo] ?? "auto";
    if (src === locale) return;
    let alive = true;
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
    return () => {
      alive = false;
    };
  }, [selected, locale]);

  // 選択語の訳(記事と同じrate-limited経路・自己キャッシュ)。同言語ならしない
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWordTr(null);
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
    return () => {
      alive = false;
    };
  }, [selected, locale]);

  // trends: 指定国のトレンドを読む。seedで自動ダイブ
  const loadTrends = async (geo: string, seed?: string) => {
    const myGen = genRef.current; // この呼び出しの世代。await後に古ければ中断
    setLoading(true);
    setError(null);
    setSelected(null);
    expandedRef.current = new Set();
    cancelCamera();
    if (diveTimerRef.current) clearTimeout(diveTimerRef.current);
    const { w, h } = sizeRef.current;
    try {
      const res = await fetch(`/api/trends?geo=${geo}`);
      if (genRef.current !== myGen) return; // 別マウントに切り替わっていたら触らない
      if (!res.ok) throw new Error(`trends ${res.status}`);
      const data: { items: TrendItem[] } = await res.json();
      if (genRef.current !== myGen) return;
      // loadTrends は effect/イベントから呼ばれる非render関数。出生時刻に現在時刻を使うのは意図的
      // eslint-disable-next-line react-hooks/purity
      const born = performance.now();
      nodesRef.current = data.items.map((it, i) => ({
        id: it.word,
        isSeed: true,
        geo,
        news: it.news,
        firstSeen: it.firstSeen,
        depth: 0, // 親(トレンド語)
        bornAt: born + i * 14, // 少しずつ生まれる
        r: trendRadius(it.traffic),
        x: w / 2 + (Math.random() - 0.5) * w * 0.35,
        y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      }));
      linksRef.current = [];
      reheat(1);
      // 整定させてから「最初から全体を引きで」スナップ表示(初手の忙しさを断つ)
      settleSim(160);
      snapTo(null);
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
            depth: 0,
            // eslint-disable-next-line react-hooks/purity
            bornAt: performance.now(),
            r: 13,
            x: w / 2,
            y: h / 2,
          };
          nodesRef.current.push(seedNode);
          reheat(1);
          settleSim(120);
          snapTo(null);
        }
        // 俯瞰を少しだけ見せてから、対象へ ease-in-out で緩やかにズーム(急加速しない)。
        // 着地では詳細シートは開かない(画面半分を占有しない)。詳細はタップで初めて出す
        const node = seedNode;
        diveTimerRef.current = setTimeout(async () => {
          if (genRef.current !== myGen) return; // 古いマウントのダイブは実行しない
          node.fx = node.x; // 中心を固定→ズーム対象がブレず、固定目標へ正確に着地する
          node.fy = node.y;
          node.vx = 0; // 残存速度で吹き飛ばない
          node.vy = 0;
          await onNodeHit(node, { select: false }); // 子をリング配置で開く(整定不要)
          if (genRef.current !== myGen) return;
          tweenTo(node.id, 1500); // 開くのと同時に対象へ緩やかにズーム
        }, 200);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  };

  // select: 詳細シートを開くか。自動ダイブ(着地)では展開だけして開かない
  const onNodeHit = async (node: GNode, opts?: { select?: boolean }) => {
    if (opts?.select !== false) {
      setSelected({ word: node.id, geo: node.geo, news: node.news, isSeed: node.isSeed });
      // 開いた直後の合成クリックがパネル内リンクに当たらないよう一時的に無効化
      setPanelArmed(false);
      setTimeout(() => setPanelArmed(true), 350);
    }

    if (expandedRef.current.has(node.id)) return;
    expandedRef.current.add(node.id);

    const hl = GEO_HL[node.geo] ?? "ja";
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(node.id)}&hl=${hl}`);
      if (!res.ok) return;
      const data: { suggestions: string[] } = await res.json();
      const suggestions = data.suggestions;

      const ids = new Set(nodesRef.current.map((n) => n.id));
      // 新規の子だけをリング状に配置する。force任せに広げないので整定が要らず、
      // 全体が一気に動く「ガコッ」が出ない & 置いた瞬間にズーム対象が確定する
      const fresh = suggestions.filter((s) => !ids.has(s));
      // リング半径を子の数に応じて広げる(角度の混雑=重なり/交差を減らす)
      const ringR = Math.max(72, 9 * fresh.length);
      const bornC = performance.now();
      fresh.forEach((s, i) => {
        const a = (i / Math.max(1, fresh.length)) * Math.PI * 2 - Math.PI / 2;
        ids.add(s);
        nodesRef.current.push({
          id: s,
          isSeed: false,
          geo: node.geo,
          news: [],
          depth: (node.depth ?? 0) + 1, // 親より1段深い
          bornAt: bornC + i * 22, // 子も少しずつ生まれる
          r: 7,
          x: node.x + Math.cos(a) * ringR,
          y: node.y + Math.sin(a) * ringR,
        });
      });
      for (const s of suggestions) {
        linksRef.current.push({ source: node.id, target: s });
      }
      // 既存ノードと分離させるため少し強めに再加熱(collideで重なりを解く)
      reheat(0.5);
    } catch {
      /* サジェスト失敗は無視 */
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    genRef.current++; // このマウントを最新世代に(前マウントの非同期処理を無効化)

    let dpr = window.devicePixelRatio || 1;
    {
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const sim = forceSimulation<GNode>([])
      // distanceMax: 反発を近距離だけに(遠いノード群同士が強く押し合うのを防ぐ)。
      // strengthを少し強めて、子ノード同士の重なり/線の交差を減らす
      .force("charge", forceManyBody<GNode>().strength(-160).distanceMax(260))
      .force("link", forceLink<GNode, GLink>([]).id((d) => d.id).distance(72).strength(0.5))
      .force(
        "center",
        forceCenter(sizeRef.current.w / 2, sizeRef.current.h / 2).strength(0.06),
      )
      // collideを強め(重なり防止=交差軽減)
      .force("collide", forceCollide<GNode>((n) => n.r + 20).strength(0.9).iterations(2))
      .alphaDecay(0.03);
    simRef.current = sim;

    let raf = 0;
    const draw = () => {
      // カメラのトゥイーン(ease-in-out)。固定目標へ緩やかに寄せる。整定済み座標が
      // 対象なので「忙しい/急加速」が出ない。ユーザー操作で即キャンセルされる
      const tw = camTweenRef.current;
      if (tw) {
        const p = Math.min(1, (performance.now() - tw.start) / tw.dur);
        // ease-in-out cubic: 入りの加速がより穏やか
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        transformRef.current = {
          k: tw.from.k + (tw.to.k - tw.from.k) * e,
          x: tw.from.x + (tw.to.x - tw.from.x) * e,
          y: tw.from.y + (tw.to.y - tw.from.y) * e,
        };
        if (p >= 1) camTweenRef.current = null;
      }

      const css = getComputedStyle(document.documentElement);
      const pal = {
        canvas: css.getPropertyValue("--canvas").trim() || "#0a0a0a",
        leaf: css.getPropertyValue("--suggest").trim() || "#52a8ff",
        linkLine: css.getPropertyValue("--link-line").trim() || "rgba(255,255,255,0.16)",
        labelFg: css.getPropertyValue("--label-fg").trim() || "#ededed",
      };
      const nowSec = Date.now() / 1000;

      const { w, h } = sizeRef.current;
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

      // パス1: ノードの円(常に描く)。seed=新しさ配色 / leaf=青。出生時は半径を0→フルにスケールイン
      const nowMs = performance.now();
      for (const n of nodesRef.current) {
        let bs = 1;
        if (n.bornAt) {
          const tb = Math.max(0, Math.min(1, (nowMs - n.bornAt) / 600)); // 出現前は0でクランプ(負の半径防止)
          bs = tb * (2 - tb); // easeOutQuad
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * bs, 0, Math.PI * 2);
        ctx.fillStyle = n.isSeed ? freshnessColor(n.firstSeen, nowSec) : pal.leaf;
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
        // 100%では親(depth0)だけ文字表示。ズームで段階に達した深さの語からフェードインで出す
        const la = depthAlpha(n.depth ?? 0, t.k);
        if (la <= 0.05) continue;
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
        ctx.globalAlpha = la;
        ctx.strokeStyle = pal.canvas;
        ctx.strokeText(n.id, lx, ly);
        ctx.fillStyle = pal.labelFg;
        ctx.fillText(n.id, lx, ly);
        placed.push(box);
      }
      ctx.globalAlpha = 1;
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
        cancelCamera(); // ピンチ中は自動カメラを止める
        pointers.set(e.pointerId, cur);
        return;
      }
      pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (!down) return;
      const dx = e.offsetX - down.sx;
      const dy = e.offsetY - down.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (down.moved) {
        cancelCamera(); // ユーザー操作中は自動カメラを止める
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
      cancelCamera(); // ホイール操作中は自動カメラを止める
      const t = transformRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const k = Math.min(5, Math.max(0.15, t.k * factor));
      const wx = (e.offsetX - t.x) / t.k;
      const wy = (e.offsetY - t.y) / t.k;
      t.k = k;
      t.x = e.offsetX - wx * k;
      t.y = e.offsetY - wy * k;
    };

    // 端末回転・ウィンドウ/URLバー伸縮でcanvasを追従(未対応だと歪み・タップ判定ズレ)
    const onResize = () => {
      dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const center = sim.force("center") as ReturnType<typeof forceCenter>;
      center.x(w / 2).y(h / 2);
      tweenTo(null, 500); // 回転/リサイズ後は全体を入れ直す(緩やかに)
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // 初期化(URLパラメータ反映の一度きりのsetState)。geo未指定の既定: 英語UIは米国/日本語UIは日本
    const params = new URLSearchParams(window.location.search);
    const fallbackGeo = locale === "en" ? "US" : "JP";
    const raw = (params.get("geo") || fallbackGeo).toUpperCase();
    const geoParam = GEO_LABELS[raw] ? raw : fallbackGeo;
    const seedParam = params.get("seed") || undefined;
    selectRef.current = geoParam;
    setSel(geoParam);
    void loadTrends(geoParam, seedParam);

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (diveTimerRef.current) clearTimeout(diveTimerRef.current);
    };
    // マウント時に一度だけ初期化する(意図的)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchSelect = (v: string) => {
    setSel(v);
    selectRef.current = v;
    void loadTrends(v);
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
    const stamp = `earth-trend ${selectRef.current} ${new Date().toLocaleDateString()}`;
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

  const options = Object.entries(COUNTRY_LABELS[locale] ?? GEO_LABELS);

  return (
    <div
      data-mode="trends"
      style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--canvas)" }}
    >
      <canvas ref={canvasRef} style={{ display: "block", cursor: "grab", touchAction: "none" }} />

      <SiteHeader overlay />

      <div className="canvas-controls">
        <select
          className="btn"
          value={sel}
          onChange={(e) => switchSelect(e.target.value)}
          aria-label={tx.graph.selectCountry}
        >
          {options.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={exportImage}>
          {tx.graph.saveImage}
        </button>
        {loading && <span className="muted">Loading...</span>}
        {error && <span style={{ color: "#e5484d" }}>Error: {error}</span>}
      </div>

      {selected && (
        <div className="detail-panel" ref={panelRef}>
          <div className="panel" style={{ pointerEvents: panelArmed ? "auto" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong translate="no">{selected.word}</strong>
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

            {selected.news.length > 0 ? (
              <NewsCarousel news={selected.news} translated={newsTr} />
            ) : (
              <p className="muted" style={{ margin: "8px 0 0" }}>
                {selected.isSeed ? tx.graph.seedTrends : tx.graph.leafTrends}
              </p>
            )}

            {/* 選択語のGoogle検索はパネル内に集約(対象は上の見出しで明確。長語でも折り返さない) */}
            <a
              className="btn"
              style={{
                display: "block",
                marginTop: 12,
                padding: "10px 16px",
                fontSize: 14,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
              href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tx.detail.googleSearch}
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
