import { ImageResponse } from "next/og";
import { OG_SIZE } from "@/lib/og-world-trends";
import { SITE_DOMAIN } from "@/lib/site";

// ブランドOG(トレンド実データ以外のページ用)。better-auth調の黒・ミニマル・ワードマーク主体。
// トレンドの正体である「バブル」を小さなマークとして添え、製品とブランドを繋ぐ。
const DOTS = [
  { cx: 17, cy: 20, r: 11, fill: "#ff8a3d" },
  { cx: 33, cy: 14, r: 8, fill: "#2ecc40" },
  { cx: 31, cy: 31, r: 6, fill: "#52a8ff" },
  { cx: 8, cy: 33, r: 5, fill: "#2ecc40" },
];

export function brandOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          backgroundImage:
            "radial-gradient(55% 55% at 50% 40%, rgba(90,130,210,0.12), rgba(10,10,10,0) 70%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* eyebrow: マーク + 一言 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width={42} height={42} viewBox="0 0 42 42">
            {DOTS.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} />
            ))}
          </svg>
          <span style={{ fontSize: 26, color: "#aab2c0", letterSpacing: 1 }}>
            the world&apos;s curiosity, live
          </span>
        </div>

        {/* ワードマーク */}
        <div
          style={{
            display: "flex",
            fontSize: 112,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: -4,
            marginTop: 16,
          }}
        >
          earth-trend
        </div>

        {/* タグライン */}
        <div style={{ display: "flex", fontSize: 27, color: "#7f8794", marginTop: 16 }}>
          a living map of what the world is searching · {SITE_DOMAIN}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
