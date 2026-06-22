import { NextResponse } from "next/server";
import { getGalleryData } from "@/lib/gallery-data";

// 全対象国の急上昇をまとめて返す(地球儀/一覧の図用)。全画面が同一の getGalleryData(単一キャッシュ
// キー)を参照する=どのページの図も「同じ瞬間」のデータになり、時刻/内容のドリフトが起きない。
export async function GET() {
  const data = await getGalleryData();
  return NextResponse.json(
    { data: Object.fromEntries(data) },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
  );
}
