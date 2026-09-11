import CountryTile from "@/components/CountryTile";
import { COUNTRY_LABELS } from "@/lib/copy";
import { type TileItem } from "@/lib/gallery-data";

// 一覧の図グリッド。snapshot完了時の明示的なタグ失効で静的HTMLごと更新される。
export default function GalleryGrid({
  initial,
  nowSec,
}: {
  initial: [string, TileItem[]][];
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
        <CountryTile key={g} geo={g} label={COUNTRY_LABELS[g] ?? g} items={items} nowSec={nowSec} />
      ))}
    </div>
  );
}
