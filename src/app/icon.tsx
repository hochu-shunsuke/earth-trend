import { ImageResponse } from "next/og";

// シンプルなfavicon: 暗い角丸に、集合的注意を象す2色の点
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 8, top: 11, width: 9, height: 9, borderRadius: 9, background: "#ff8a3d" }} />
        <div style={{ position: "absolute", left: 17, top: 16, width: 7, height: 7, borderRadius: 7, background: "#52a8ff" }} />
      </div>
    ),
    size,
  );
}
