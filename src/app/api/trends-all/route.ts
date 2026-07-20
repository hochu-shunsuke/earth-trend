import { NextResponse } from "next/server";
import { getGalleryData } from "@/lib/gallery-data";

// 全対象国の急上昇をまとめて返す(地球儀/一覧の図用)。全画面が同一の getGalleryData(単一キャッシュ
// キー)を参照する=どのページの図も「同じ瞬間」のデータになり、時刻/内容のドリフトが起きない。
export async function GET() {
  const data = await getGalleryData();
  // CDNキャッシュは付けない: URLごとに別タイマーになり、getGalleryData(単一キャッシュキー)
  // が持つ「全ページ同じ瞬間」という前提が崩れてドリフトする(内部のunstable_cacheで十分低コスト)
  return NextResponse.json({ data: Object.fromEntries(data) });
}
