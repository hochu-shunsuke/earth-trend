import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";

interface TrendItem {
  word: string;
  traffic: string;
  firstSeen?: number;
}

// 一覧用の各国ミニマップ(サーバー描画のSVG=JS不要・SEOに強い)。
// 円の面積=規模 / 色=新しさ。クリックでその国のフルマップへ。
export default function CountryTile({
  geo,
  locale,
  label,
  items,
  nowSec,
}: {
  geo: string;
  locale: string;
  label: string;
  items: TrendItem[];
  nowSec: number;
}) {
  const W = 300;
  const H = 188;
  type Datum = { children: TrendItem[] } | TrendItem;
  const root = pack<Datum>()
    .size([W, H])
    .padding(3)(
    hierarchy<Datum>({ children: items })
      .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  return (
    <Link
      href={`/${locale}/${geo.toLowerCase()}`}
      className="card-link"
      style={{
        display: "block",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        color: "var(--fg)",
        background: "var(--panel)",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", background: "var(--canvas)" }}
        aria-hidden
      >
        {root.leaves().map((l, i) => (
          <circle
            key={i}
            cx={l.x}
            cy={l.y}
            r={l.r}
            fill={freshnessColor((l.data as TrendItem).firstSeen, nowSec)}
          />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "8px 12px",
        }}
      >
        <strong style={{ fontSize: 15 }}>{label}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {items.length > 0 ? `${items.length}${locale === "ja" ? "件" : ""}` : "—"}
        </span>
      </div>
    </Link>
  );
}
