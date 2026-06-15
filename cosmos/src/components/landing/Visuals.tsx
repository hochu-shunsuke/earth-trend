// ランディング用の「ポスター」ビジュアル。各ビューの見た目を想起させる装飾SVG。
// すべてサーバー描画(クライアントJS不要)。アニメは純CSS(globals.cssのlp-pop/lp-draw/lp-spin)。
// 色はテーマ変数を参照して両テーマに追従。
import { hierarchy, pack } from "d3-hierarchy";

const PALETTE = ["var(--trend)", "var(--new)", "var(--suggest)", "var(--accent)"];

// トレンド: 各国タイル風のパック円(円=ボリューム/色=新しさ)。無から広がって出てくる。
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
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="trends">
      {root.leaves().map((leaf) => {
        const cell = leaf.data as Cell;
        return (
          <circle
            key={cell.i}
            className="lp-pop"
            style={{ animationDelay: `${cell.i * 0.12}s` }}
            cx={leaf.x}
            cy={leaf.y}
            r={leaf.r}
            fill={PALETTE[cell.i % PALETTE.length]}
            opacity={0.7 + (leaf.r / 40) * 0.3}
          />
        );
      })}
    </svg>
  );
}

// 分析: 複数の起点から円状に根が伸びる(探求と差別化)。根が描かれ、葉が生まれる。
export function AnalysisPreview() {
  const W = 320;
  const H = 240;
  const seeds = [
    { x: 96, y: 92 },
    { x: 224, y: 104 },
    { x: 150, y: 182 },
  ];
  const perSeed = 6;
  const rootLen = 58;
  const line = "var(--link-line)";
  type Leaf = { x: number; y: number; d: number };
  const roots: { x1: number; y1: number; x2: number; y2: number; d: number }[] = [];
  const leaves: Leaf[] = [];
  seeds.forEach((s, si) => {
    for (let k = 0; k < perSeed; k++) {
      const a = (k / perSeed) * Math.PI * 2 + si * 0.5;
      const x2 = s.x + Math.cos(a) * rootLen;
      const y2 = s.y + Math.sin(a) * rootLen * 0.82;
      const d = (si * perSeed + k) * 0.09;
      roots.push({ x1: s.x, y1: s.y, x2, y2, d });
      leaves.push({ x: x2, y: y2, d });
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="analysis">
      <g stroke={line} strokeWidth={1.4} fill="none">
        {roots.map((r, i) => (
          <line
            key={i}
            className="lp-draw"
            style={{ animationDelay: `${r.d}s` }}
            pathLength={1}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
          />
        ))}
      </g>
      {leaves.map((l, i) => (
        <circle
          key={i}
          className="lp-pop"
          style={{ animationDelay: `${l.d + 0.18}s` }}
          cx={l.x}
          cy={l.y}
          r={4.5}
          fill="var(--suggest)"
          opacity={0.85}
        />
      ))}
      {seeds.map((s, i) => (
        <circle key={`s${i}`} className="lp-pop" style={{ animationDelay: `${i * 0.12}s` }} cx={s.x} cy={s.y} r={11} fill="var(--trend)" />
      ))}
    </svg>
  );
}

// 探求: 1つの起点から枝分かれする連想グラフ。枝が描かれ、ノードが生まれる。
export function BranchPreview() {
  const W = 320;
  const H = 240;
  const sx = 46;
  const sy = H / 2;
  const children = [-0.62, -0.32, 0, 0.32, 0.62].map((a) => ({
    x: sx + 124,
    y: sy + a * (H * 0.42),
  }));
  const grand: { x: number; y: number; px: number; py: number }[] = [];
  children.forEach((c, i) => {
    const n = i % 2 === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      grand.push({ x: c.x + 110, y: c.y + (k - (n - 1) / 2) * 44, px: c.x, py: c.y });
    }
  });
  const line = "var(--link-line)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="quest">
      <g stroke={line} strokeWidth={1.4} fill="none">
        {children.map((c, i) => (
          <line key={`c${i}`} className="lp-draw" style={{ animationDelay: `${0.15 + i * 0.08}s` }} pathLength={1} x1={sx} y1={sy} x2={c.x} y2={c.y} />
        ))}
        {grand.map((g, i) => (
          <line key={`g${i}`} className="lp-draw" style={{ animationDelay: `${0.5 + i * 0.08}s` }} pathLength={1} x1={g.px} y1={g.py} x2={g.x} y2={g.y} />
        ))}
      </g>
      {grand.map((g, i) => (
        <circle key={`gd${i}`} className="lp-pop" style={{ animationDelay: `${0.7 + i * 0.08}s` }} cx={g.x} cy={g.y} r={5} fill="var(--suggest)" opacity={0.8} />
      ))}
      {children.map((c, i) => (
        <circle key={`cd${i}`} className="lp-pop" style={{ animationDelay: `${0.3 + i * 0.08}s` }} cx={c.x} cy={c.y} r={8} fill="var(--suggest)" />
      ))}
      <circle className="lp-pop" cx={sx} cy={sy} r={15} fill="var(--trend)" />
    </svg>
  );
}

// 地球儀: 経線が回転(球の自転)。注意の灯りは球から少し離れて周囲を周回。
export function GlobePreview() {
  const S = 320;
  const c = S / 2;
  const r = 116;
  const meridianRx = [r, r * 0.62, r * 0.28];
  // 周回する灯り(球の外側)
  const orbit = r + 22;
  const dots = [0, 0.62, 1.18, 1.9, 2.5, 3.1, 3.8, 4.5, 5.2].map((a, i) => ({
    x: c + Math.cos(a) * orbit,
    y: c + Math.sin(a) * orbit * 0.92,
    i,
  }));
  return (
    <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="globe">
      <circle cx={c} cy={c} r={r} fill="var(--accent)" opacity={0.06} />
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--link-line)" strokeWidth={1.5} />
      {/* 緯線(静止) */}
      <g fill="none" stroke="var(--link-line)" strokeWidth={1}>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((p, i) => (
          <ellipse key={`p${i}`} cx={c} cy={c + p * r} rx={Math.sqrt(Math.max(0, 1 - p * p)) * r} ry={r * 0.12} />
        ))}
      </g>
      {/* 経線(回転=自転) */}
      <g className="lp-spin" fill="none" stroke="var(--link-line)" strokeWidth={1}>
        {meridianRx.map((rx, i) => (
          <ellipse key={`m${i}`} cx={c} cy={c} rx={rx} ry={r} />
        ))}
      </g>
      {/* 周回する灯り */}
      <g className="lp-orbit">
        {dots.map((d) => (
          <circle key={d.i} className="lp-pop" style={{ animationDelay: `${d.i * 0.14}s` }} cx={d.x} cy={d.y} r={4.5} fill={PALETTE[d.i % PALETTE.length]} />
        ))}
      </g>
    </svg>
  );
}
