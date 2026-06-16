"use client";

import { useState } from "react";
import Link from "next/link";
import { hierarchy, pack } from "d3-hierarchy";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { useInView } from "@/lib/useInView";
import { localePath, type Locale } from "@/lib/i18n";

interface TrendItem {
  word: string;
  traffic: string;
  firstSeen?: number;
}

// 一覧用の各国ミニマップ。円の面積=規模 / 色=新しさ。クリックでその国のフルマップへ。
// 円は読み込み時に一度出現。ホバーするたびに「瞬間消滅→出現(0.5s)」を1回だけ再生
// (再生中に解除されても最後まで完走/再ホバーで頭から)。<g key> を差し替えて再マウントで実現。
export default function CountryTile({
  geo,
  locale,
  label,
  items,
  nowSec,
}: {
  geo: string;
  locale: Locale;
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

  const [runId, setRunId] = useState(0);
  // タイルが画面に入って初めて円を描く=出現アニメも入った時だけ発火。スマホ縦で9国が
  // 一斉にポップするのを防ぎ、スクロールで見えたタイルから順に出る。
  const { ref, inView } = useInView<SVGSVGElement>("150px");

  return (
    <Link
      href={localePath(locale, `/${geo.toLowerCase()}`)}
      className="card-link trend-tile"
      onMouseEnter={() => setRunId((n) => n + 1)}
    >
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", background: "var(--canvas)" }}
        aria-hidden
      >
        {/* key を変えると再マウント=出現アニメが頭から再生(ホバーのたび)。
            in-view前は描かない=画面外タイルは一斉ポップしない */}
        <g key={runId}>
          {inView &&
            root.leaves().map((l, i) => (
              <circle
                key={i}
                className="tile-pop"
                style={{ animationDelay: `${i * 0.045}s` }}
                cx={l.x}
                cy={l.y}
                r={l.r}
                fill={freshnessColor((l.data as TrendItem).firstSeen, nowSec)}
              />
            ))}
        </g>
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
