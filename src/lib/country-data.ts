import { getWorld, type WorldItem } from "@/lib/world";

/**
 * 国別ページ用。訳は持たない(英語1本化で自前の翻訳は廃止)。
 * 読者の母国語への変換はブラウザのGoogle翻訳が担い、トレンド語は translate="no" で原語が残る。
 */
export async function getCountryItems(code: string): Promise<WorldItem[]> {
  return (await getWorld()).geos[code] ?? [];
}
