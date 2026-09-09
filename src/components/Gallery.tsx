import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import GalleryGrid from "@/components/GalleryGrid";
import { getGalleryData } from "@/lib/gallery-data";
import { t, localePath, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

// 各国の「注意の地図」一覧。ルート(/) と /ja /en で共有(ロケールだけ差し替え)。
// SiteHeaderにはlocaleを明示で渡す(ルートはURLにロケールが無いため)。
export default async function Gallery({ locale }: { locale: Locale }) {
  const d = t(locale);
  const labels = COUNTRY_LABELS[locale];
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  const data = await getGalleryData();

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

        <GalleryGrid initial={data} locale={locale} labels={labels} nowSec={nowSec} />

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          {d.home.legendFooter}{" "}
          <Link href={localePath(locale, "/about")} className="muted">
            {d.home.about}
          </Link>
        </p>
      </main>
    </>
  );
}
