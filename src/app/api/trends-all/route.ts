import { NextResponse } from "next/server";
import { getGalleryData } from "@/lib/gallery-data";

// 全対象国の急上昇をまとめて返す(地球儀用)。実体は world:v1 の単一キャッシュなので、
// どのページの図も「同じ瞬間」のデータになり、時刻/内容のドリフトが起きない。
export async function GET() {
  const data = await getGalleryData();
  return NextResponse.json({ data: Object.fromEntries(data) });
}
