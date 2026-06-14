import { ImageResponse } from "next/og";
import { hierarchy, pack } from "d3-hierarchy";
import { GEO_LABELS } from "@/lib/trends";
import { getTrendsUnionedCached } from "@/lib/history";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { COUNTRY_LABELS } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

// トップ(世界のトレンド)のOG/シェア画像。毎回全部は重いので「2か国をランダム」で。
// revalidateで1時間キャッシュ=毎時ちがう2か国に入れ替わる(コスト小・新鮮)。
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";
export const revalidate = 3600;

const REGIONS = [
  { ox: 56, oy: 60, w: 380, h: 420 },
  { ox: 470, oy: 60, w: 380, h: 420 },
];

export default async function Image() {
  // 2か国ランダム抽出
  const geos = [...Object.keys(GEO_LABELS)].sort(() => Math.random() - 0.5).slice(0, 2);
  const data = await Promise.all(
    geos.map(async (g) => [g, await getTrendsUnionedCached(g)] as const),
  );
  const nowSec = Math.floor(Date.now() / 1000);

  type Item = (typeof data)[number][1][number];
  type Datum = { children: Item[] } | Item;

  const maps = data.map(([geo, items], i) => {
    const r = REGIONS[i];
    const root =
      items.length > 0
        ? pack<Datum>()
            .size([r.w, r.h])
            .padding(5)(
            hierarchy<Datum>({ children: items })
              .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
              .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
          )
        : null;
    return { geo, region: r, root };
  });

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
        <svg width={size.width} height={size.height} style={{ position: "absolute", left: 0, top: 0 }}>
          {maps.map(
            (m) =>
              m.root?.leaves().map((leaf, j) => (
                <circle
                  key={`${m.geo}-${j}`}
                  cx={m.region.ox + leaf.x}
                  cy={m.region.oy + leaf.y}
                  r={leaf.r}
                  fill={freshnessColor((leaf.data as Item).firstSeen, nowSec)}
                />
              )),
          )}
        </svg>

        {/* 各マップの国名(英語=フォント不要) */}
        {maps.map((m) => (
          <div
            key={m.geo}
            style={{
              position: "absolute",
              left: m.region.ox,
              top: m.region.oy + m.region.h + 6,
              width: m.region.w,
              display: "flex",
              justifyContent: "center",
              fontSize: 26,
              color: "#cfd6e0",
              fontWeight: 600,
            }}
          >
            {COUNTRY_LABELS.en[m.geo] ?? m.geo}
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            right: 52,
            top: 0,
            height: "100%",
            width: 320,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 50, fontWeight: 700, color: "#fafafa", letterSpacing: -2 }}>
            World Trends
          </div>
          <div style={{ fontSize: 25, color: "#aab2c0", marginTop: 8 }}>
            live search · 9 countries
          </div>
          <div style={{ fontSize: 25, color: "#52a8ff", marginTop: 26, fontWeight: 600 }}>
            {SITE_NAME}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
