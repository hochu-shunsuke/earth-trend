import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeoSelect from "@/components/GeoSelect";
import LiveStamp from "@/components/LiveStamp";
import TrendsView from "@/components/TrendsView";
import ShareButton from "@/components/ShareButton";
import NewsTitle from "@/components/NewsTitle";
import WordGloss from "@/components/WordGloss";
import { jsonLd } from "@/lib/site";
import { ALLOWED_GEO, GEO_LABELS, GEO_LANG } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";
import { translate } from "@/lib/translate";
import { toLocale, t, localePath, altLanguages, durationStr, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

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
  // ニュース見出しの原語。SSRは原語(=SEO)、クライアントでlocaleへ訳す(NewsTitle)
  const newsLang = GEO_LANG[code] ?? "auto";
  // 「登場からの経過」表示用の基準時刻(ISR 10分なので分解能は十分)
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  // 「最終更新」は描画時刻ではなく実データの時刻(最新スナップのlastSeen)を出す=鮮度に正直
  const updatedSec = items.reduce((mx, it) => Math.max(mx, it.lastSeen ?? 0), 0);

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

        {/* サーバー描画のテキスト一覧: 原語＋訳＋ニュースがHTMLに入る=SEO/JS無し/読み上げの土台 */}
        {items.length > 0 && (
          <section style={{ marginTop: 28 }}>
            {/* 構造化データ: 急上昇のランキングを ItemList で明示。トレンド語は外部由来なので
                jsonLd()で "<" をエスケープし script脱出(XSS)を防ぐ */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: jsonLd({
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: d.country.seoHeading(country),
                  numberOfItems: items.length,
                  itemListElement: items.slice(0, 20).map((it, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: it.word,
                  })),
                }),
              }}
            />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{d.country.seoHeading(country)}</h2>
            <p style={{ margin: "4px 0 0" }}>
              <LiveStamp
                iso={new Date((updatedSec || nowSec) * 1000).toISOString()}
                locale={locale}
                label={d.country.updated}
              />
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {items.map((it) => (
                <li
                  key={it.word}
                  style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}
                >
                  <Link
                    href={`${localePath(locale, "/analysis")}?geo=${code}&seed=${encodeURIComponent(it.word)}`}
                    translate="no"
                    style={{ fontWeight: 600 }}
                  >
                    {it.word}
                  </Link>
                  <WordGloss word={it.word} from={newsLang} to={locale} initial={it.translation} />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {" "}
                    ・ {d.detail.searches} {it.traffic}
                    {it.firstSeen &&
                      ` ・ ${d.detail.appeared(durationStr(it.firstSeen, nowSec, locale) ?? "")}`}
                  </span>
                  {/* なぜ流行ってるか=ニュース見出しをHTMLテキストで(SEO=語彙/文脈/独自性) */}
                  {it.news.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0" }}>
                      {it.news.slice(0, 2).map((n, i) => (
                        <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
                          {n.url ? (
                            <a href={n.url} target="_blank" rel="noopener nofollow" className="muted">
                              <NewsTitle title={n.title} from={newsLang} to={locale} />
                            </a>
                          ) : (
                            <NewsTitle title={n.title} from={newsLang} to={locale} />
                          )}
                          {n.source && <span> ({n.source})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 横断比較=独自価値の言語化 + 他国への内部リンク(クロール深度/比較ナビ) */}
        <nav style={{ marginTop: 28 }}>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {d.country.compare(country)}
          </p>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 14 }}>
            {Object.keys(GEO_LABELS)
              .filter((g) => g !== code)
              .map((g) => (
                <Link key={g} href={localePath(locale, `/${g.toLowerCase()}`)}>
                  {COUNTRY_LABELS[locale][g] ?? g}
                </Link>
              ))}
          </div>
        </nav>
      </main>
    </>
  );
}
