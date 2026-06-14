import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import CountryTile from "@/components/CountryTile";
import { ALLOWED_GEO, GEO_LABELS } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";
import { toLocale, t, COUNTRY_LABELS } from "@/lib/i18n";

export const revalidate = 600;

// 9国分のデータを10分キャッシュ(訪問あたりのUpstashコストをほぼゼロに。ローンチ耐性)
const getGalleryData = unstable_cache(
  async (): Promise<[string, RecentTrendItem[]][]> =>
    Promise.all(
      Object.keys(GEO_LABELS).map(async (g) => [g, await fetchTrendsUnioned(g)] as [string, RecentTrendItem[]]),
    ),
  ["gallery-data-v2"],
  { revalidate: 600 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  const d = t(locale);
  return {
    title: d.home.title,
    description: d.home.desc,
    alternates: { canonical: `/${locale}`, languages: { ja: "/ja", en: "/en" } },
  };
}

// ホーム = 各国の「注意の地図」一覧。芸術的に並べ、国ごとの詳細(/ja/jp 等)へ降りる入口
export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ geo?: string }>;
}) {
  const locale = toLocale((await params).lang);
  const d = t(locale);
  const labels = COUNTRY_LABELS[locale];

  // 旧 /?geo=XX リンクは各国ルートへ転送(SEO/互換)
  const { geo } = await searchParams;
  if (geo && ALLOWED_GEO.has(geo.toUpperCase())) redirect(`/${locale}/${geo.toLowerCase()}`);

  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  const data = await getGalleryData();

  return (
    <>
      <SiteHeader />
      <main style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "72px 16px 48px" }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{d.home.title}</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {d.home.desc}
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {data.map(([g, items]) => (
            <CountryTile
              key={g}
              geo={g}
              locale={locale}
              label={labels[g] ?? g}
              items={items}
              nowSec={nowSec}
            />
          ))}
        </div>

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          {d.home.legendFooter}{" "}
          <Link href={`/${locale}/about`} className="muted">
            {d.home.about}
          </Link>
        </p>
      </main>
    </>
  );
}
