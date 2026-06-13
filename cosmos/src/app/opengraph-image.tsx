import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// シェア時の画像カード(全ルート共通)。CJKフォント不要にするためラテン+記号のみで構成
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "earth-trend — a living map of the world's curiosity";

// 集合的注意のモチーフ: 散らばる点(疑似乱数で決定的に配置)
function dots() {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 46; i++) {
    out.push({ x: rnd() * 1200, y: rnd() * 630, r: 2 + rnd() * 6, o: 0.12 + rnd() * 0.5 });
  }
  return out;
}

export default function OgImage() {
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
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {dots().map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r * 2,
              background: i % 5 === 0 ? "#ff8a3d" : "#52a8ff",
              opacity: d.o,
            }}
          />
        ))}
        <div style={{ fontSize: 76, fontWeight: 700, color: "#fafafa", letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ marginTop: 14, fontSize: 30, color: "#9b9b9b" }}>
          a living map of the world&apos;s curiosity
        </div>
      </div>
    ),
    size,
  );
}
