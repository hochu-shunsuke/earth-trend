import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, localeFromAcceptLanguage } from "@/lib/i18n";

// ロケール無しのパスを /[locale]/... へ転送(初回はAccept-Language判定)。SEOのper-locale URL化。
// ただしルート(/)は「本物のトップ」を描画するのでリダイレクトしない(ブランドURLを正準ハブに)。
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") return NextResponse.next();

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const locale = localeFromAcceptLanguage(req.headers.get("accept-language"));
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // api・静的・メタファイル(sitemap/robots/icon/og)は除外
  matcher: ["/((?!api|_next|.*\\..*|sitemap.xml|robots.txt|icon|opengraph-image).*)"],
};
