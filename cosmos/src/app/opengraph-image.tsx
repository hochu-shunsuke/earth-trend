import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// シェア時の画像カード(全ルート共通)。CJK不要にするためラテン+記号のみ。
// 背景は地球儀ページの「線のアース」をSVGワイヤーフレームで再現
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "earth-trend — a living map of the world's curiosity";

const CX = 600;
const CY = 315;
const R = 260;
const line = "rgba(150,170,210,0.30)";

// 緯線(水平リング): 円の各高さでの半幅から
const parallels = [-170, -90, 0, 90, 170].map((dy) => ({
  cy: CY + dy,
  rx: Math.round(Math.sqrt(Math.max(0, R * R - dy * dy))),
}));

// 集合的注意を表す点(地球上に決定的に配置)
const dots = [
  { x: 500, y: 220, c: "#52a8ff", r: 6 },
  { x: 690, y: 250, c: "#ff8a3d", r: 7 },
  { x: 600, y: 190, c: "#52a8ff", r: 5 },
  { x: 470, y: 330, c: "#52a8ff", r: 5 },
  { x: 735, y: 340, c: "#ff8a3d", r: 6 },
  { x: 560, y: 380, c: "#52a8ff", r: 6 },
  { x: 690, y: 420, c: "#52a8ff", r: 5 },
  { x: 540, y: 460, c: "#ff8a3d", r: 6 },
  { x: 640, y: 300, c: "#52a8ff", r: 7 },
  { x: 700, y: 480, c: "#52a8ff", r: 4 },
];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <svg width={1200} height={630} style={{ position: "absolute", left: 0, top: 0 }}>
          {/* 外周 */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={line} strokeWidth={1.5} />
          {/* 緯線 */}
          {parallels.map((p, i) => (
            <ellipse
              key={`p${i}`}
              cx={CX}
              cy={p.cy}
              rx={p.rx}
              ry={Math.max(8, Math.round(p.rx * 0.14))}
              fill="none"
              stroke={line}
              strokeWidth={1}
            />
          ))}
          {/* 経線(縦リング) */}
          {[210, 140, 70].map((rx, i) => (
            <ellipse key={`m${i}`} cx={CX} cy={CY} rx={rx} ry={R} fill="none" stroke={line} strokeWidth={1} />
          ))}
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke={line} strokeWidth={1} />
          {/* 注意の点 */}
          {dots.map((d, i) => (
            <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={0.9} />
          ))}
        </svg>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 78, fontWeight: 700, color: "#fafafa", letterSpacing: -2 }}>
            {SITE_NAME}
          </div>
          <div style={{ marginTop: 12, fontSize: 30, color: "#aab2c0" }}>
            a living map of the world&apos;s curiosity
          </div>
        </div>
      </div>
    ),
    size,
  );
}
