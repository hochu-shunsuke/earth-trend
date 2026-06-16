"use client";

import { useEffect, useState } from "react";
import CountryTile from "@/components/CountryTile";
import { type Locale } from "@/lib/i18n";

interface TrendItem {
  word: string;
  traffic: string;
  firstSeen?: number;
}

// 一覧の図グリッド。SSRの初期データで即描画し、着地時に /api/trends-all(=全画面共通の単一
// getGalleryDataキャッシュ)から最新へ差し替える。これで /trends の図と各国ページの図が
// 「同じ瞬間」のデータになり、時刻/内容のドリフトが解消する。並び順(訪問国を先頭等)は維持。
export default function GalleryGrid({
  initial,
  locale,
  labels,
  nowSec: initialNow,
}: {
  initial: [string, TrendItem[]][];
  locale: Locale;
  labels: Record<string, string>;
  nowSec: number;
}) {
  const [data, setData] = useState(initial);
  const [nowSec, setNowSec] = useState(initialNow);
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowSec(Math.floor(Date.now() / 1000));
    fetch("/api/trends-all")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!alive || !res?.data) return;
        // SSRの並び順を保ったまま、各国のitemsだけ最新へ差し替える
        setData((prev) => prev.map(([g]) => [g, (res.data[g] ?? []) as TrendItem[]]));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14,
      }}
    >
      {data.map(([g, items]) => (
        <CountryTile
          key={g}
          geo={g}
          locale={locale}
          label={labels[g] ?? g}
          items={items}
          nowSec={nowSec}
        />
      ))}
    </div>
  );
}
