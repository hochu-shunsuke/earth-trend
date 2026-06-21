import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import GeoSelect from "@/components/GeoSelect";
import TrendsView from "@/components/TrendsView";
import ShareButton from "@/components/ShareButton";
import { jsonLd } from "@/lib/site";
import { ALLOWED_GEO, GEO_LABELS, GEO_LANG, geoSlug, slugToGeo } from "@/lib/trends";
import { type RecentTrendItem } from "@/lib/history";
import { getGalleryData } from "@/lib/gallery-data";
import { translate } from "@/lib/translate";
import { toLocale, t, localePath, altLanguages, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

type TranslatedItem = RecentTrendItem & { translation?: string };

export const revalidate = 600;

// データ＋翻訳を10分キャッシュ(訪問あたりのUpstash/翻訳コストをほぼゼロに。ローンチ耐性)。
// データは getGalleryData(全画面共通の単一ソース)から取り出す=trends/と各国ページが同じ瞬間に揃う。
const getCountryItems = unstable_cache(
  async (code: string, locale: Locale): Promise<TranslatedItem[]> => {
    const all = await getGalleryData();
    const raw = all.find(([g]) => g === code)?.[1] ?? [];
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
  ["country-items-v3"],
  { revalidate: 600 },
);

// 9カ国を静的生成(SEO: 各国×各ロケールが独立したインデックス可能ランディング)
export function generateStaticParams() {
  return Object.keys(GEO_LABELS).map((g) => ({ geo: geoSlug(g) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}): Promise<Metadata> {
  const { lang, geo } = await params;
  const locale = toLocale(lang);
  const code = slugToGeo(geo);
  const country = COUNTRY_LABELS[locale][code];
  if (!country) return {};
  const d = t(locale);
  return {
    title: d.country.title(country),
    description: d.country.seoHeading(country),
    alternates: {
      canonical: localePath(locale, `/${geoSlug(code)}`),
      languages: altLanguages(`/${geoSlug(code)}`),
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
  const code = slugToGeo(geo);
  // 正準スラグ以外(例: /es/es や未対応geo)は弾く=重複URL/無効を防ぐ
  if (!ALLOWED_GEO.has(code) || geo !== geoSlug(code)) notFound();
  const country = COUNTRY_LABELS[locale][code];

  // 語の翻訳はサーバー描画時(HTMLに原語＋訳=SEO/即時)＋10分キャッシュ
  const items = await getCountryItems(code, locale);
  // 「登場からの経過」表示用の基準時刻(ISR 10分なので分解能は十分)。TrendsViewへ渡す
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);

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
          <>
            {/* 構造化データ: 急上昇のランキングを ItemList で明示(SSR=クローラ向け)。トレンド語は
                外部由来なので jsonLd()で "<" をエスケープし script脱出(XSS)を防ぐ */}
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
            {/* 図とSEOテキスト一覧の両方をTrendsViewが描く=同じliveItemsから同じ瞬間に更新。
                SSRは初期state(items)で描かれる=JS無し/クローラ向けの土台は維持 */}
            <TrendsView items={items} geo={code} locale={locale} nowSec={nowSec} />
          </>
        ) : (
          <p className="muted">{d.country.loadFail}</p>
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
                <Link key={g} href={localePath(locale, `/${geoSlug(g)}`)}>
                  {COUNTRY_LABELS[locale][g] ?? g}
                </Link>
              ))}
          </div>
        </nav>
      </main>
    </>
  );
}
