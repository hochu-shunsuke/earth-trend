// ランディング用の「ポスター」ビジュアル。各ビューの見た目を想起させる装飾SVG。
// すべてサーバー描画(クライアントJS不要・高速)。色はテーマ変数を参照して両テーマに追従。
import { hierarchy, pack } from "d3-hierarchy";

const PALETTE = ["var(--trend)", "var(--new)", "var(--suggest)", "var(--accent)"];

// トレンド: パック円の集合(円の大きさ=ボリューム、色=新しさ を想起)
export function TrendsPreview() {
  const W = 440;
  const H = 360;
  const sizes = [42, 38, 33, 30, 28, 25, 23, 21, 20, 18, 17, 16, 15, 14, 13, 12, 12, 11, 10, 10, 9, 8, 8, 7];
  interface Cell {
    v: number;
    i: number;
  }
  type Datum = { children: Cell[] } | Cell;
  const root = pack<Datum>()
    .size([W, H])
    .padding(4)(
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
            cx={leaf.x}
            cy={leaf.y}
            r={leaf.r}
            fill={PALETTE[cell.i % PALETTE.length]}
            opacity={0.7 + (leaf.r / 42) * 0.3}
          />
        );
      })}
    </svg>
  );
}

// ヒーロー装飾: 大きい丸の集合が右から画面外にはみ出して覗く
export function HeroBubbles() {
  // viewBox内の座標。右端(x≈670+)は意図的に画面外へはみ出す
  const bubbles = [
    { r: 188, cx: 460, cy: 270, color: "var(--trend)",   op: 0.72 },
    { r: 152, cx: 300, cy: 190, color: "var(--suggest)", op: 0.76 },
    { r: 128, cx: 590, cy: 148, color: "var(--new)",     op: 0.68 },
    { r:  98, cx: 240, cy: 368, color: "var(--accent)",  op: 0.70 },
    { r: 136, cx: 548, cy: 418, color: "var(--trend)",   op: 0.58 },
    { r:  78, cx: 145, cy: 252, color: "var(--suggest)", op: 0.66 },
    { r: 168, cx: 672, cy: 308, color: "var(--new)",     op: 0.52 },
  ];
  return (
    <svg
      viewBox="0 0 750 500"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      {bubbles.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.color} opacity={b.op} />
      ))}
    </svg>
  );
}

// 分析/探求: 起点(seed)から枝分かれする連想グラフを想起
export function BranchPreview() {
  const W = 440;
  const H = 340;
  const sx = 64;
  const sy = H / 2;
  // 子をやや右にファンアウト、孫をさらに右へ
  const children = [-0.62, -0.32, 0, 0.32, 0.62].map((a) => ({
    x: sx + 168,
    y: sy + a * (H * 0.42),
  }));
  const grand: { x: number; y: number; px: number; py: number }[] = [];
  children.forEach((c, i) => {
    const n = i % 2 === 0 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      grand.push({
        x: c.x + 150,
        y: c.y + (k - (n - 1) / 2) * 56,
        px: c.x,
        py: c.y,
      });
    }
  });
  const line = "var(--link-line)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="analysis">
      <g stroke={line} strokeWidth={1.5}>
        {children.map((c, i) => (
          <line key={`c${i}`} x1={sx} y1={sy} x2={c.x} y2={c.y} />
        ))}
        {grand.map((g, i) => (
          <line key={`g${i}`} x1={g.px} y1={g.py} x2={g.x} y2={g.y} />
        ))}
      </g>
      {grand.map((g, i) => (
        <circle key={`gd${i}`} cx={g.x} cy={g.y} r={6} fill="var(--suggest)" opacity={0.8} />
      ))}
      {children.map((c, i) => (
        <circle key={`cd${i}`} cx={c.x} cy={c.y} r={10} fill="var(--suggest)" />
      ))}
      <circle cx={sx} cy={sy} r={18} fill="var(--trend)" />
    </svg>
  );
}

// 地球儀: 経緯線と注意の灯り(点)が散る球を想起
export function GlobePreview() {
  const S = 360;
  const c = S / 2;
  const r = 150;
  const parallels = [-0.66, -0.33, 0, 0.33, 0.66];
  const meridianRx = [r, r * 0.66, r * 0.34, r * 0.34, r * 0.66];
  // 球面上の灯り(見た目用の固定座標)
  const dots = [
    [c - 60, c - 50],
    [c + 40, c - 70],
    [c + 70, c + 10],
    [c - 30, c + 60],
    [c + 10, c - 10],
    [c - 90, c + 20],
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="globe">
      <circle cx={c} cy={c} r={r} fill="var(--accent)" opacity={0.06} />
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--link-line)" strokeWidth={1.5} />
      <g fill="none" stroke="var(--link-line)" strokeWidth={1}>
        {parallels.map((p, i) => (
          <ellipse key={`p${i}`} cx={c} cy={c + p * r} rx={Math.sqrt(Math.max(0, 1 - p * p)) * r} ry={r * 0.12} />
        ))}
        {meridianRx.map((rx, i) => (
          <ellipse key={`m${i}`} cx={c} cy={c} rx={rx} ry={r} />
        ))}
      </g>
      {dots.map(([x, y], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={5} fill={PALETTE[i % PALETTE.length]} />
      ))}
    </svg>
  );
}
