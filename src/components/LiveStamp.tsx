"use client";

import { useEffect, useState } from "react";

// 「ライブ感」を安く正直に伝えるだけの表示(自動更新はしない=PHILOSOPHYの判断)。
// サーバーが描画時刻(iso)を渡し、クライアントで相対(X分前)を1分ごとに更新。
function rel(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} h ago`;
}

export default function LiveStamp({ iso, label }: { iso: string; label: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span className="live-dot" aria-hidden />
      {label} <time dateTime={iso}>{rel(iso)}</time>
    </span>
  );
}
