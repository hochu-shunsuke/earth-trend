import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeoSelect from "@/components/GeoSelect";
import TrendsView from "@/components/TrendsView";
import ShareButton from "@/components/ShareButton";
import { ALLOWED_GEO, GEO_LABELS, GEO_LANG } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";
import { translate } from "@/lib/translate";
import { toLocale, t, localePath, altLanguages, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

type TranslatedItem = RecentTrendItem & { translation?: string };

export const revalidate = 600;

// データ＋翻訳を10分キャッシュ(訪問あたりのUpstash/翻訳コストをほぼゼロに。ローンチ耐性)
const getCountryItems = unstable_cache(
  async (code: string, locale: Locale): Promise<TranslatedItem[]> => {
    const raw = await fetchTrendsUnioned(code);
    const src = GEO_LANG[code] ?? "auto";
    if (src === locale) return raw;
    // cacheOnly: 温め済みの訳だけを使う(同時バーストでGoogleに弾かれるのを防ぐ)
    return Promise.all(
      raw.map(async (it) => ({
        ...it,
        translation: (await translate(it.word, src, locale, true)) ?? undefined,
      })),
    );
  },
  ["country-items-v2"],
  { revalidate: 600 },
);

// 9カ国を静的生成(SEO: 各国×各ロケールが独立したインデックス可能ランディング)
export function generateStaticParams() {
  return Object.keys(GEO_LABELS).map((g) => ({ geo: g.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}): Promise<Metadata> {
  const { lang, geo } = await params;
  const locale = toLocale(lang);
  const code = geo.toUpperCase();
  const country = COUNTRY_LABELS[locale][code];
  if (!country) return {};
  const d = t(locale);
  return {
    title: d.country.title(country),
    description: d.country.seoHeading(country),
    alternates: {
      canonical: localePath(locale, `/${geo.toLowerCase()}`),
      languages: altLanguages(`/${geo.toLowerCase()}`),
    },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}) {
  const { lang, geo } = await params;
  const locale = toLocale(lang);
  const d = t(locale);
  const code = geo.toUpperCase();
  if (!ALLOWED_GEO.has(code)) notFound();
  const country = COUNTRY_LABELS[locale][code];

  // 語の翻訳はサーバー描画時(HTMLに原語＋訳=SEO/即時)＋10分キャッシュ
  const items = await getCountryItems(code, locale);

  return (
    <>
      <SiteHeader />
      <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "72px 16px 48px" }}>
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {d.country.title(country)}
            </h1>
            <Link href={localePath(locale, "/trends")} className="muted" style={{ fontSize: 13 }}>
              {d.country.all}
            </Link>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GeoSelect geo={code} />
            <ShareButton locale={locale} geo={code} title={d.country.title(country)} />
          </div>
        </header>

        {items.length > 0 ? (
          <TrendsView items={items} geo={code} locale={locale} />
        ) : (
          <p className="muted">{d.country.loadFail}</p>
        )}

        {/* サーバー描画のテキスト一覧: 原語＋訳がHTMLに入る=SEO/JS無し/読み上げの土台 */}
        {items.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{d.country.seoHeading(country)}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {items.map((it) => (
                <li
                  key={it.word}
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}
                >
                  <Link
                    href={`${localePath(locale, "/analysis")}?geo=${code}&seed=${encodeURIComponent(it.word)}`}
                    translate="no"
                  >
                    {it.word}
                  </Link>
                  {it.translation && <span className="muted"> — {it.translation}</span>}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {" "}
                    ・ {d.detail.searches} {it.traffic}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
