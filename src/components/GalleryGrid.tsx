import CountryTile from "@/components/CountryTile";
import { type Locale } from "@/lib/i18n";

interface TrendItem {
  word: string;
  traffic: string;
  firstSeen?: number;
}

// 一覧の図グリッド。snapshot完了時の明示的なタグ失効で静的HTMLごと更新されるため、
// 着地時の /api/trends-all 二重取得は行わない。
export default function GalleryGrid({
  initial,
  locale,
  labels,
  nowSec,
}: {
  initial: [string, TrendItem[]][];
  locale: Locale;
  labels: Record<string, string>;
  nowSec: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14,
      }}
    >
      {initial.map(([g, items]) => (
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
