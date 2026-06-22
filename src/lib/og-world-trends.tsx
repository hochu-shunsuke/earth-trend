import { ImageResponse } from "next/og";
import { hierarchy, pack } from "d3-hierarchy";
import { GEO_LABELS } from "@/lib/trends";
import { getTrendsUnionedCached } from "@/lib/history";
import { parseTraffic, freshnessColor } from "@/lib/trendsVisual";
import { SITE_DOMAIN } from "@/lib/site";

// トレンドのOG/シェア画像(トップ・国別 共通)。1か国のバブル(色=新しさ)+右に見出し。
// トップ=ランダム1か国+「World Trends」、国別=指定国+その国名。レイアウト/フォントは完全共通。
export const OG_SIZE = { width: 1200, height: 630 };

const PACK = 540; // パックの基準サイズ(直径スケール)
const CLUSTER_CX = 378; // クラスタの水平中心(右はテキスト用に空ける)

interface OgOpts {
  geo?: string; // 未指定ならランダム1か国
  title: string;
  subtitle: string;
}

export async function trendsOgImage(opts: OgOpts): Promise<ImageResponse> {
  const geo =
    opts.geo?.toUpperCase() ??
    [...Object.keys(GEO_LABELS)].sort(() => Math.random() - 0.5)[0];
  const items = GEO_LABELS[geo] ? await getTrendsUnionedCached(geo) : [];
  const nowSec = Math.floor(Date.now() / 1000);

  type Item = (typeof items)[number];
  type Datum = { children: Item[] } | Item;
  const root =
    items.length > 0
      ? pack<Datum>()
          .size([PACK, PACK])
          .padding(6)(
          hierarchy<Datum>({ children: items })
            .sum((d) => ("traffic" in d ? Math.max(1, parseTraffic(d.traffic)) : 0))
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
        )
      : null;

  // 外接円の箱ではなく「実際のバブル群の外接矩形」を画像の縦中央/指定x中心に合わせる
  // (pack は外接円の上側に円が寄り、見た目が上寄りになるのを補正)
  const leaves = root ? root.leaves() : [];
  let offX = 0;
  let offY = 0;
  let clusterBottom = OG_SIZE.height / 2; // クラスタの実下端(URLの下端を揃える基準)
  if (leaves.length > 0) {
    const minX = Math.min(...leaves.map((l) => l.x - l.r));
    const maxX = Math.max(...leaves.map((l) => l.x + l.r));
    const minY = Math.min(...leaves.map((l) => l.y - l.r));
    const maxY = Math.max(...leaves.map((l) => l.y + l.r));
    offX = CLUSTER_CX - (minX + maxX) / 2;
    offY = OG_SIZE.height / 2 - (minY + maxY) / 2;
    clusterBottom = maxY + offY;
  }

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
          <svg width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", left: 0, top: 0 }}>
            {leaves.map((leaf, i) => (
              <circle
                key={i}
                cx={offX + leaf.x}
                cy={offY + leaf.y}
                r={leaf.r}
                fill={freshnessColor((leaf.data as Item).firstSeen, nowSec)}
              />
            ))}
          </svg>
        )}

        {/* 見出し+サブ(右・縦中央) */}
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 0,
            height: "100%",
            width: 420,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#fafafa", letterSpacing: -2 }}>
            {opts.title}
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#aab2c0", marginTop: 8 }}>
            {opts.subtitle}
          </div>
        </div>

        {/* ブランドアンカー: earth-trend.com を右下に大きく(白)。下端をクラスタ下端に揃える */}
        <div
          style={{
            position: "absolute",
            right: 56,
            bottom: Math.round(OG_SIZE.height - clusterBottom),
            display: "flex",
            fontSize: 46,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: -1.5,
          }}
        >
          {SITE_DOMAIN}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
