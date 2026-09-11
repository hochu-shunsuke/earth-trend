import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CountryRail, { type CountryRailItem } from "@/components/CountryRail";
import TrendsView from "@/components/TrendsView";
import ShareButton from "@/components/ShareButton";
import SiteFooter from "@/components/SiteFooter";
import { jsonLd } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";
import { getCountryItems } from "@/lib/country-data";
import { COPY, COUNTRY_LABELS, countryPath } from "@/lib/copy";

export default async function CountryExperience({ code }: { code: string }) {
  const country = COUNTRY_LABELS[code];
  const items = await getCountryItems(code);
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);

  const codes = Object.keys(GEO_LABELS);
  const currentIndex = Math.max(0, codes.indexOf(code));
  const railItems: CountryRailItem[] = codes.map((geo) => ({
    code: geo,
    label: COUNTRY_LABELS[geo] ?? geo,
    href: countryPath(geo),
  }));
  const previous = railItems[(currentIndex - 1 + railItems.length) % railItems.length];
  const next = railItems[(currentIndex + 1) % railItems.length];

  return (
    <>
      <SiteHeader />
      <main className="country-page-main">
        <header className="country-page-header">
          <div className="country-title-row">
            <div>
              <h1>{COPY.country.title(country)}</h1>
            </div>
            <div className="country-actions">
              <Link href="/" className="muted">
                {COPY.country.all}
              </Link>
              <ShareButton geo={code} title={COPY.country.title(country)} />
            </div>
          </div>
          <CountryRail
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
                  name: COPY.country.seoHeading(country),
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
              nowSec={nowSec}
              previousCountry={previous}
              nextCountry={next}
            />
          </div>
        ) : (
          <p className="muted">{COPY.country.loadFail}</p>
        )}

      </main>
      <SiteFooter />
    </>
  );
}
