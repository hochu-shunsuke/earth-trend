import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CountryRail, { type CountryRailItem } from "@/components/CountryRail";
import TrendsView from "@/components/TrendsView";
import ShareButton from "@/components/ShareButton";
import { jsonLd } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";
import { getCountryItems } from "@/lib/country-data";
import { t, localePath, countryPath, COUNTRY_LABELS, type Locale } from "@/lib/i18n";

export default async function CountryExperience({ locale, code }: { locale: Locale; code: string }) {
  const d = t(locale);
  const country = COUNTRY_LABELS[locale][code];
  const items = await getCountryItems(code, locale);
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);

  const codes = Object.keys(GEO_LABELS);
  const currentIndex = Math.max(0, codes.indexOf(code));
  const railItems: CountryRailItem[] = codes.map((geo) => ({
    code: geo,
    label: COUNTRY_LABELS[locale][geo] ?? geo,
    href: countryPath(locale, geo),
  }));
  const previous = railItems[(currentIndex - 1 + railItems.length) % railItems.length];
  const next = railItems[(currentIndex + 1) % railItems.length];

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="country-page-main">
        <header className="country-page-header">
          <div className="country-title-row">
            <div>
              <h1>{d.country.title(country)}</h1>
            </div>
            <div className="country-actions">
              <Link href={localePath(locale)} className="muted">
                {d.country.all}
              </Link>
              <ShareButton locale={locale} geo={code} title={d.country.title(country)} />
            </div>
          </div>
          <CountryRail
            locale={locale}
            currentGeo={code}
            countries={railItems}
            previous={previous}
            next={next}
          />
        </header>

        {items.length > 0 ? (
          <div className="country-stage" key={code}>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: jsonLd({
                  "@context": "https://schema.org",
                  "@type": "ItemList",
                  name: d.country.seoHeading(country),
                  numberOfItems: items.length,
                  itemListElement: items.slice(0, 20).map((item, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: item.word,
                  })),
                }),
              }}
            />
            <TrendsView
              items={items}
              geo={code}
              locale={locale}
              nowSec={nowSec}
              previousCountry={previous}
              nextCountry={next}
            />
          </div>
        ) : (
          <p className="muted">{d.country.loadFail}</p>
        )}

        <nav className="country-link-list">
          <p className="muted">{d.country.compare(country)}</p>
          <div>
            {railItems
              .filter((item) => item.code !== code)
              .map((item) => (
                <Link key={item.code} href={item.href}>
                  {item.label}
                </Link>
              ))}
          </div>
        </nav>
      </main>
    </>
  );
}
