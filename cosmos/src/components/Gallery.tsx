import Link from "next/link";
import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import CountryTile from "@/components/CountryTile";
import { getGalleryData } from "@/lib/gallery-data";
import { t, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

// 各国の「注意の地図」一覧。ルート(/) と /ja /en で共有(ロケールだけ差し替え)。
// SiteHeaderにはlocaleを明示で渡す(ルートはURLにロケールが無いため)。
export default async function Gallery({ locale }: { locale: Locale }) {
  const d = t(locale);
  const labels = COUNTRY_LABELS[locale];
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  let data = await getGalleryData();

  // 自動ロケーション: Vercelの国ヘッダで、訪問者の国が対象なら先頭に(俯瞰は壊さず関連性UP)
  const visitorGeo = (await headers()).get("x-vercel-ip-country")?.toUpperCase();
  if (visitorGeo && data.some(([g]) => g === visitorGeo)) {
    data = [...data].sort((a) => (a[0] === visitorGeo ? -1 : 0));
  }

  return (
    <>
      <SiteHeader locale={locale} />
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
