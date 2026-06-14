import { ImageResponse } from "next/og";
import { hierarchy, pack } from "d3-hierarchy";
import { ALLOWED_GEO } from "@/lib/trends";
import { fetchTrendsUnioned } from "@/lib/history";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { COUNTRY_LABELS } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

// 各国ページのOG/シェア画像 = その国の「注意の地図」(pack円・色=新しさ)。
// 誰かがリンクを共有するとプレビューにこの地図が出る = バイラル装置。
// 文字は英語(ラテン)のみ=CJKフォント不要。トレンド語は入れない(フォント都合)。
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "earth-trend — live search trends";

const MAP_W = 620;
const MAP_H = 560;
const OX = 48;
const OY = 35;

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}) {
  const { geo } = await params;
  const code = (geo || "").toUpperCase();
  const country = COUNTRY_LABELS.en[code] ?? code;
  const items = ALLOWED_GEO.has(code) ? await fetchTrendsUnioned(code) : [];
  const nowSec = Math.floor(Date.now() / 1000);

  type Datum = { children: typeof items } | (typeof items)[number];
  const root =
    items.length > 0
      ? pack<Datum>()
          .size([MAP_W, MAP_H])
          .padding(6)(
          hierarchy<Datum>({ children: items })
            .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
        )
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {root && (
          <svg width={size.width} height={size.height} style={{ position: "absolute", left: 0, top: 0 }}>
            {root.leaves().map((leaf, i) => (
              <circle
                key={i}
                cx={OX + leaf.x}
                cy={OY + leaf.y}
                r={leaf.r}
                fill={freshnessColor(
                  (leaf.data as (typeof items)[number]).firstSeen,
                  nowSec,
                )}
              />
            ))}
          </svg>
        )}
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 0,
            height: "100%",
            width: 440,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: "#fafafa", letterSpacing: -2 }}>
            {country}
          </div>
          <div style={{ fontSize: 30, color: "#aab2c0", marginTop: 6 }}>live search trends</div>
          <div style={{ fontSize: 26, color: "#52a8ff", marginTop: 28, fontWeight: 600 }}>
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
