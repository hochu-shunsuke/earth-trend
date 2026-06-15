"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

// 「ライブ感」を安く正直に伝えるだけの表示(自動更新はしない=PHILOSOPHYの判断)。
// サーバーが描画時刻(iso)を渡し、クライアントで相対(X分前)を1分ごとに更新。
function rel(iso: string, locale: Locale): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (locale === "ja") return min < 1 ? "たった今" : min < 60 ? `${min}分前` : `${Math.floor(min / 60)}時間前`;
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.floor(min / 60)} h ago`;
}

export default function LiveStamp({ iso, locale, label }: { iso: string; locale: Locale; label: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span className="live-dot" aria-hidden />
      {label} <time dateTime={iso}>{rel(iso, locale)}</time>
    </span>
  );
}
