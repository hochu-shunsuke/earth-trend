import { GEO_LABELS } from "@/lib/trends";
import { getWorld } from "@/lib/world";

/** 一覧タイル(CountryTile)が実際に描くのは 面積=traffic / 色=firstSeen だけ */
export interface TileItem {
  word: string;
  traffic: string;
  firstSeen?: number;
}

/**
 * トップの一覧用に必要な3項目だけへ射影する。CountryTile はクライアント境界なので、
 * 射影しないと表示されないニュース(見出し・URL・媒体名)まで全24国分がRSCペイロードへ
 * 直列化される(実測 345KB / gzip 109KB。可視テキストは453文字しかない)。
 */
export async function getGalleryTiles(): Promise<[string, TileItem[]][]> {
  const world = await getWorld();
  return Object.keys(GEO_LABELS).map((geo) => [
    geo,
    (world.geos[geo] ?? []).map(({ word, traffic, firstSeen }) => ({ word, traffic, firstSeen })),
  ]);
}
