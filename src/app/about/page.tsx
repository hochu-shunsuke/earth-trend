import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_OPERATOR,
  SITE_EMAIL,
  SITE_GITHUB,
  jsonLd,
} from "@/lib/site";

const C = {
    title: "About",
    desc: `What ${SITE_NAME} is, where the data comes from, and privacy.`,
    tagline: "The world's trends, as a living map.",
    whatTitle: "What is this",
    what: `Search is humanity's most honest record of "what we want to know." ${SITE_NAME} is a place to watch what the world is paying attention to right now — 24 countries side by side, as one living map. Less an analytics tool, more a mirror onto the world's curiosity.`,
    views: [
      ["World", "All 24 countries side by side, as maps of attention"],
      ["Country", "One country up close — size, freshness, and why it is burning"],
    ],
    whyTitle: "Why I made this",
    why: "This project began with a philosophy, not a feature. Today's social feeds and search are so personalized they mostly reflect ourselves; Google Trends, meanwhile, is just a sterile table. I wanted to watch the flow of the world's collective attention from a different, more playful angle — and to experiment with how data itself can be expressed. This is that attempt. I'll keep updating it while continually rethinking what it's for.",
    dataTitle: "About the data",
    data: `We show public data from Google Trends (trending searches), fetched and cached every 30 minutes per country. Search terms are always shown in their original script — we never replace them. We arrange them with our own encoding: circle size = search volume, color = how recently the term appeared. This is an unofficial personal project, not affiliated with Google LLC or any company.`,
    operatorTitle: "Who runs this",
    operator: `An independent personal project run by ${SITE_OPERATOR}. Feedback, corrections and bug reports are welcome.`,
    privacyTitle: "Privacy",
    privacy:
      "There is no sign-up, and we do not store your personal information. We may use anonymous usage statistics (Google Analytics) to improve the site.",
    faqTitle: "FAQ",
    faq: [
      [
        "Is the data real-time?",
        "Not strictly real-time. Each country's data is fetched and cached every 30 minutes — a design choice to stay polite to the source (Google).",
      ],
      [
        "How many countries are covered?",
        "24 countries. Starting from Japan, the US, the UK, India, South Korea, Taiwan, Germany, France and Brazil, we keep expanding across the English- and Spanish-speaking world and major markets.",
      ],
      [
        "Is this an official Google service?",
        "No. It's an unofficial personal project with no affiliation to Google LLC. We independently visualize public data from Google Trends.",
      ],
      [
        "How is this different from Google Trends?",
        "Less an analytics tool, more a mirror onto the world's curiosity. With our own encoding — circle size = search volume, color = how recently a term appeared — you can feel the 'now' of attention, and compare it across 24 countries in one view.",
      ],
      [
        "The site is in English, but the search terms are not. Why?",
        "Because the raw term is the point. \u300c\u3060\u3093\u3058\u308a\u796d\u300d should stay \u300c\u3060\u3093\u3058\u308a\u796d\u300d, not become \"Danjiri Festival.\" The terms are marked so your browser's translation leaves them untouched while translating everything around them — so you can read the page in your own language and still see what the world actually typed.",
      ],
      [
        "Are the sizes and rankings exact numbers?",
        "They're relative. Circle size reflects the relative magnitude of search volume, not a share of all searches.",
      ],
    ] as [string, string][],
};

export const metadata: Metadata = {
  title: C.title,
  description: C.desc,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const c = C;
  return (
    <>
      <SiteHeader />
      <main
        style={{
          width: "100%",
          maxWidth: 680,
          margin: "0 auto",
          padding: "72px 16px 64px",
          lineHeight: 1.8,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>{SITE_NAME}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {c.tagline}
        </p>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.whatTitle}</h2>
          <p>{c.what}</p>
          <ul>
            {c.views.map(([name, desc]) => (
              <li key={name}>
                <strong>{name}</strong> — {desc}
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.whyTitle}</h2>
          <p>{c.why}</p>
        </section>

        <section id="data" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.dataTitle}</h2>
          <p>{c.data}</p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.operatorTitle}</h2>
          <p>{c.operator}</p>
          <p style={{ margin: "4px 0 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>
            <a href={SITE_GITHUB} target="_blank" rel="me noopener">
              GitHub
            </a>
          </p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.privacyTitle}</h2>
          <p>{c.privacy}</p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>{c.faqTitle}</h2>
          {c.faq.map(([q, a]) => (
            <div key={q} style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{q}</h3>
              <p style={{ margin: "4px 0 0" }}>{a}</p>
            </div>
          ))}
        </section>

        {/* 構造化データ: WebApplication(実体)＋ FAQPage(People Also Ask 獲得)。
            事実の明示であり、サイトの「正直さ」と一致する */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  name: SITE_NAME,
                  url: SITE_URL,
                  description: SITE_DESCRIPTION,
                  applicationCategory: "ReferenceApplication",
                  operatingSystem: "Web",
                  inLanguage: ["ja", "en", "es"],
                  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                },
                {
                  "@type": "FAQPage",
                  mainEntity: c.faq.map(([q, a]) => ({
                    "@type": "Question",
                    name: q,
                    acceptedAnswer: { "@type": "Answer", text: a },
                  })),
                },
              ],
            }),
          }}
        />

        <p style={{ marginTop: 32 }}>
          <Link href="/">← {SITE_NAME}</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
