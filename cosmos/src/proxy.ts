import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

function detectLocale(req: NextRequest): string {
  const al = (req.headers.get("accept-language") || "").toLowerCase();
  const first = al.split(",")[0]?.trim() ?? "";
  if (first.startsWith("en")) return "en";
  if (first.startsWith("ja")) return "ja";
  return DEFAULT_LOCALE;
}

// ロケール無しのパスを /[locale]/... へ転送(初回はAccept-Language判定)。SEOのper-locale URL化
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // api・静的・メタファイル(sitemap/robots/icon/og)は除外
  matcher: ["/((?!api|_next|.*\\..*|sitemap.xml|robots.txt|icon|opengraph-image).*)"],
};
