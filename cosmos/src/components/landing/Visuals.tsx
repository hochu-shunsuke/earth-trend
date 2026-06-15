// ランディング用の「ポスター」ビジュアル。モノクロ・シンプル。
// アニメは純CSS(globals.css の lp-pop / lp-draw)。要素ごとに負の遅延で位相を分散。
// 地球儀のみ経線を SMIL(rxスイープ)で自転。
import { hierarchy, pack } from "d3-hierarchy";

const LINE = "var(--link-line)";
const NODE = "var(--fg)";

// トレンド: 国タイル風のパック円(モノクロ・大きさ=ボリューム)。無から広がって出てくる。
export function TrendsPreview() {
  const W = 320;
  const H = 200;
  const sizes = [40, 36, 31, 28, 26, 24, 22, 20, 19, 17, 16, 15, 14, 13, 12, 11, 11, 10, 9, 9, 8, 7];
  interface Cell {
    v: number;
    i: number;
  }
  type Datum = { children: Cell[] } | Cell;
  const root = pack<Datum>()
    .size([W, H])
    .padding(3)(
    hierarchy<Datum>({ children: sizes.map((v, i) => ({ v, i })) })
      .sum((d) => ("v" in d ? d.v : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );
  const leaves = root.leaves();
  const rmax = Math.max(...leaves.map((l) => l.r));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="trends">
      {leaves.map((l) => {
        const cell = l.data as Cell;
        return (
          <circle
            key={cell.i}
            className="lp-pop"
            style={{ animationDelay: `${-(cell.i * 0.2)}s` }}
            cx={l.x}
            cy={l.y}
            r={l.r}
            fill={NODE}
            opacity={0.22 + (l.r / rmax) * 0.55}
          />
        );
      })}
    </svg>
  );
}

// 分析: 中心から不均一(オーガニック)に子が広がる force-graph 風。対称にしない=自然でモダン。
export function AnalysisPreview() {
  const W = 320;
  const H = 240;
  const cx0 = 150;
  const cy0 = 118;
  // 子: [角度(deg), 距離, 孫の数(1-3)] — 角度も距離も不均一に手調整
  const spec: [number, number, number][] = [
    [-88, 62, 2],
    [-34, 82, 3],
    [22, 58, 1],
    [70, 78, 2],
    [128, 58, 3],
    [182, 76, 1],
    [232, 66, 2],
  ];
  type N = { x: number; y: number; d: number; r: number };
  type Seg = { x1: number; y1: number; x2: number; y2: number; d: number };
  const segs: Seg[] = [];
  const childNodes: N[] = [];
  const grandNodes: N[] = [];
  let idx = 0;
  spec.forEach(([deg, len, gN], i) => {
    const a = (deg * Math.PI) / 180;
    const x = cx0 + Math.cos(a) * len;
    const y = cy0 + Math.sin(a) * len * 0.84;
    const d = -(idx++ * 0.24);
    segs.push({ x1: cx0, y1: cy0, x2: x, y2: y, d });
    childNodes.push({ x, y, d, r: 8 });
    for (let m = 0; m < gN; m++) {
      const ga = a + (m - (gN - 1) / 2) * 0.52 + 0.12;
      const gx = x + Math.cos(ga) * (42 + (i % 2) * 6);
      const gy = y + Math.sin(ga) * 38;
      const gd = -(idx++ * 0.24);
      segs.push({ x1: x, y1: y, x2: gx, y2: gy, d: gd });
      grandNodes.push({ x: gx, y: gy, d: gd, r: 5 });
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="analysis">
      <g stroke={LINE} strokeWidth={1.3} fill="none">
        {segs.map((r, i) => (
          <line key={i} className="lp-draw" style={{ animationDelay: `${r.d}s` }} pathLength={1} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      {grandNodes.map((g, i) => (
        <circle key={`g${i}`} className="lp-pop" style={{ animationDelay: `${g.d - 0.3}s` }} cx={g.x} cy={g.y} r={g.r} fill={NODE} opacity={0.7} />
      ))}
      {childNodes.map((cN, i) => (
        <circle key={`c${i}`} className="lp-pop" style={{ animationDelay: `${cN.d - 0.3}s` }} cx={cN.x} cy={cN.y} r={cN.r} fill={NODE} opacity={0.85} />
      ))}
      <circle className="lp-pop" style={{ animationDelay: "-2.5s" }} cx={cx0} cy={cy0} r={14} fill={NODE} />
    </svg>
  );
}

// 探求: 1つの起点から枝分かれする連想グラフ。枝が描かれ、ノードが生まれる。
export function BranchPreview() {
  const W = 320;
  const H = 240;
  const sx = 46;
  const sy = H / 2;
  const children = [-0.62, -0.32, 0, 0.32, 0.62].map((a) => ({ x: sx + 124, y: sy + a * (H * 0.42) }));
  const grand: { x: number; y: number; px: number; py: number }[] = [];
  children.forEach((c, i) => {
    const n = i % 2 === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      grand.push({ x: c.x + 110, y: c.y + (k - (n - 1) / 2) * 44, px: c.x, py: c.y });
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="quest">
      <g stroke={LINE} strokeWidth={1.4} fill="none">
        {children.map((c, i) => (
          <line key={`c${i}`} className="lp-draw" style={{ animationDelay: `${-(i * 0.5)}s` }} pathLength={1} x1={sx} y1={sy} x2={c.x} y2={c.y} />
        ))}
        {grand.map((g, i) => (
          <line key={`g${i}`} className="lp-draw" style={{ animationDelay: `${-(0.3 + i * 0.5)}s` }} pathLength={1} x1={g.px} y1={g.py} x2={g.x} y2={g.y} />
        ))}
      </g>
      {grand.map((g, i) => (
        <circle key={`gd${i}`} className="lp-pop" style={{ animationDelay: `${-(0.5 + i * 0.5)}s` }} cx={g.x} cy={g.y} r={5} fill={NODE} opacity={0.7} />
      ))}
      {children.map((c, i) => (
        <circle key={`cd${i}`} className="lp-pop" style={{ animationDelay: `${-(0.2 + i * 0.55)}s` }} cx={c.x} cy={c.y} r={8} fill={NODE} opacity={0.85} />
      ))}
      <circle className="lp-pop" style={{ animationDelay: "-2.5s" }} cx={sx} cy={sy} r={14} fill={NODE} />
    </svg>
  );
}

// 地球儀: 灰の経線が自転(rxスイープ)。緯線は静止(極軸回転=物理的に正)。モノクロ。
export function GlobePreview() {
  const S = 320;
  const c = S / 2;
  const r = 132;
  const DUR = 13;
  const meridians = 5;
  // 各国の#トレンド語(球の周りに・タイプライタ風に出ては消える)
  const tags: { x: number; y: number; anchor?: "start" | "middle" | "end"; t: string; delay: number }[] = [
    { x: 30, y: 52, t: "#トレンド", delay: 0 },
    { x: 214, y: 44, t: "#trend", delay: -1.4 },
    { x: 286, y: 166, anchor: "end", t: "#트렌드", delay: -2.8 },
    { x: 196, y: 300, t: "#tendência", delay: -4.2 },
    { x: 2, y: 252, t: "#流行", delay: -5.6 },
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="globe">
      <circle cx={c} cy={c} r={r} fill={NODE} opacity={0.04} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={LINE} strokeWidth={1.5} />
      {/* 緯線(静止) */}
      <g fill="none" stroke={LINE} strokeWidth={1}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((p, i) => (
          <ellipse key={`p${i}`} cx={c} cy={c + p * r} rx={Math.sqrt(Math.max(0, 1 - p * p)) * r} ry={r * 0.12} />
        ))}
      </g>
      {/* 経線(rxを r→2→r と増減=自転。本ごとに位相をずらす) */}
      <g fill="none" stroke={LINE} strokeWidth={1}>
        {Array.from({ length: meridians }, (_, i) => (
          <ellipse key={`m${i}`} cx={c} cy={c} rx={r} ry={r}>
            <animate
              attributeName="rx"
              values={`${r};2;${r}`}
              keyTimes="0;0.5;1"
              dur={`${DUR}s`}
              begin={`${-(DUR / meridians) * i}s`}
              calcMode="spline"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              repeatCount="indefinite"
            />
          </ellipse>
        ))}
      </g>
      {/* 各国の#トレンド語を球の周りに(回転せず・タイプライタ風) */}
      <g fill={NODE} fontWeight={600} opacity={0.88} style={{ fontSize: 19 }}>
        {tags.map((tag, i) => (
          <text
            key={i}
            className="lp-type"
            style={{ animationDelay: `${tag.delay}s` }}
            x={tag.x}
            y={tag.y}
            textAnchor={tag.anchor ?? "start"}
          >
            {tag.t}
          </text>
        ))}
      </g>
    </svg>
  );
}
