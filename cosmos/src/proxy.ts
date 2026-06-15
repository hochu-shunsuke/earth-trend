import { NextResponse, type NextRequest } from "next/server";

// prefix-except-default ルーティング:
// - デフォルト言語(ja)は接頭辞なしURL(/ , /trends , /jp ...)。内部で /ja/... へ rewrite(URLは素のまま)
// - 英語は /en/... 。そのまま通す
// - 旧 /ja/... は重複なので 301 で接頭辞を剥がす(/ja/trends → /trends)
// これにより bare domain(/) が日本語の正準ページになり、被リンクが主力ページに集中する。
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 英語ロケールはそのまま
  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next();

  // /ja* は接頭辞を剥がして 301(重複解消・旧URL救済・クエリは保持)
  if (pathname === "/ja" || pathname.startsWith("/ja/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/ja(?=\/|$)/, "") || "/";
    return NextResponse.redirect(url, 301);
  }

  // それ以外(接頭辞なし)= デフォルト言語(ja)。内部 rewrite で [lang]=ja に解決(URLは素のまま)
  const url = req.nextUrl.clone();
  url.pathname = `/ja${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // api・静的・メタファイル(sitemap/robots/icon/og)は除外
  matcher: ["/((?!api|_next|.*\\..*|sitemap.xml|robots.txt|icon|opengraph-image).*)"],
};
