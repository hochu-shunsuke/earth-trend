import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { TrendsPreview, BranchPreview, GlobePreview } from "@/components/landing/Visuals";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

interface Card {
  key: string;
  title: string;
  body: string;
  path: string; // /[locale] からの相対
  visual: ReactNode;
}
interface Content {
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  sectionTitle: string;
  sectionLead: string;
  ctaTitle: string;
  cards: Card[];
}

const CONTENT: Record<Locale, Content> = {
  ja: {
    eyebrow: "検索トレンドの可視化",
    heroTitle: "世界の「知りたい」を、ひとつの地図に。",
    heroLead: "いま世界が何に注意を向けているか。検索という最も正直な記録を可視化します。",
    ctaPrimary: "世界のトレンドを見る",
    ctaSecondary: "これは何？",
    sectionTitle: "4つの視点で、世界の好奇心を探る",
    sectionLead: "急上昇の一覧から、連想の枝、人類の問い、地球儀まで。同じデータを違う角度で。",
    ctaTitle: "世界の好奇心を、覗いてみる。",
    cards: [
      {
        key: "trends",
        title: "トレンド",
        body: "円の大きさは検索ボリューム、色は燃え始めの新しさ。9カ国の急上昇を一枚の地図で。",
        path: "",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        title: "分析",
        body: "急上昇ワードを起点に、人々が次に検索する言葉へ。枝をたどると関心の流れが見える。",
        path: "/analysis",
        visual: <BranchPreview />,
      },
      {
        key: "quest",
        title: "探求",
        body: "「なぜ私は」「どうすれば」——半分打たれた問いの続きを、世界の検索が継いでいく。",
        path: "/quest",
        visual: <BranchPreview />,
      },
      {
        key: "globe",
        title: "地球儀",
        body: "世界の関心を、回る地球の上に。どの国がいま何に沸いているかを一望する。",
        path: "/globe",
        visual: <GlobePreview />,
      },
    ],
  },
  en: {
    eyebrow: "Search trends, visualized",
    heroTitle: "The world's curiosity, as one map.",
    heroLead: "What the world is paying attention to right now — search, humanity's most honest record, visualized.",
    ctaPrimary: "See world trends",
    ctaSecondary: "What is this?",
    sectionTitle: "Explore the world's curiosity from four angles",
    sectionLead: "From rising searches to associative branches, humanity's questions, and the globe. The same data, different views.",
    ctaTitle: "Look into the world's curiosity.",
    cards: [
      {
        key: "trends",
        title: "Trends",
        body: "Circle size is search volume, color is how freshly it ignited. Nine countries' rising searches on one map.",
        path: "",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        title: "Analysis",
        body: "Start from a rising word and follow what people search next. Trace the branches, see the flow of attention.",
        path: "/analysis",
        visual: <BranchPreview />,
      },
      {
        key: "quest",
        title: "Quest",
        body: "“Why am I”, “how do I” — the half-typed questions continued by the world's searches.",
        path: "/quest",
        visual: <BranchPreview />,
      },
      {
        key: "globe",
        title: "Globe",
        body: "The world's attention on a turning globe. See at a glance which country is buzzing about what.",
        path: "/globe",
        visual: <GlobePreview />,
      },
    ],
  },
};

// ブランドのトップ(/)。各ビューを説明も兼ねて見せる入口ページ(Vercel調・モノクロ基調)。
export default function LandingPage({ locale }: { locale: Locale }) {
  const c = CONTENT[locale];
  const year = new Date().getFullYear();
  return (
    <>
      <SiteHeader locale={locale} />

      <section className="lp-hero lp-container">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h1 className="lp-h1">{c.heroTitle}</h1>
        <p className="lp-lead">{c.heroLead}</p>
        <div className="lp-cta-row">
          <Link className="lp-btn lp-btn-primary" href={`/${locale}`}>
            {c.ctaPrimary}
          </Link>
          <Link className="lp-btn" href={`/${locale}/about`}>
            {c.ctaSecondary}
          </Link>
        </div>

        <div className="lp-frame">
          <div className="lp-frame-bar">
            <i />
            <i />
            <i />
          </div>
          <div className="lp-frame-body">
            <TrendsPreview />
          </div>
        </div>
      </section>

      <div className="lp-section-head">
        <h2 className="lp-h2">{c.sectionTitle}</h2>
        <p className="lp-lead">{c.sectionLead}</p>
      </div>

      <section className="lp-cards">
        {c.cards.map((card) => (
          <Link className="lp-card" key={card.key} href={`/${locale}${card.path}`}>
            <div className="lp-card-visual">{card.visual}</div>
            <div className="lp-card-text">
              <h3 className="lp-h3">{card.title}</h3>
              <p className="lp-body">{card.body}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="lp-cta lp-container">
        <h2 className="lp-h2">{c.ctaTitle}</h2>
        <Link className="lp-btn lp-btn-primary" href={`/${locale}`}>
          {c.ctaPrimary}
        </Link>
      </section>

      <footer className="lp-footer">
        <span className="muted">
          © {year} {SITE_NAME}
        </span>
        <span className="lp-foot-links">
          <Link className="muted" href={`/${locale}/about`}>
            {c.ctaSecondary}
          </Link>
          <a className="muted" href={`${SITE_URL}/sitemap.xml`}>
            sitemap
          </a>
        </span>
      </footer>
    </>
  );
}
