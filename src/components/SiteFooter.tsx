import Link from "next/link";
import { GEO_LABELS } from "@/lib/trends";
import { COUNTRY_LABELS, countryPath } from "@/lib/copy";
import { SITE_NAME, SITE_EMAIL, SITE_GITHUB, SITE_TAGLINE } from "@/lib/site";

// 読む面(ホーム/国ページ/about)にだけ置くフッター。
// analysis と globe は全画面のキャンバス体験なので付けない。
export default function SiteFooter() {
  const countries = Object.keys(GEO_LABELS);

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section className="footer-col footer-col-wide">
          <h2>Countries</h2>
          <ul className="footer-countries">
            {countries.map((geo) => (
              <li key={geo}>
                <Link href={countryPath(geo)}>{COUNTRY_LABELS[geo] ?? geo}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="footer-col">
          <h2>About</h2>
          <ul>
            <li>
              <Link href="/about">What this is</Link>
            </li>
            <li>
              <Link href="/about#data">Data &amp; method</Link>
            </li>
            <li>
              <a href={SITE_GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_EMAIL}`}>Contact</a>
            </li>
          </ul>
        </section>
      </div>

      <div className="site-footer-bar">
        <span className="footer-brand">{SITE_NAME}</span>
        <span className="footer-note">{SITE_TAGLINE}</span>
        <span className="footer-note">
          Data: Google Trends · updated every 30 min · not affiliated with Google
        </span>
      </div>
    </footer>
  );
}
