import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { TrendsPreview, AnalysisPreview, GlobePreview } from "@/components/landing/Visuals";
import HeroMarquee from "@/components/landing/HeroMarquee";
import { getGalleryData } from "@/lib/gallery-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { localePath, type Locale } from "@/lib/i18n";

interface Card {
  key: string;
  title: string;
  body: string;
  path: string; // /[locale] からの相対
  visual: ReactNode;
}
interface Content {
  heroLead: string;
  heroGiant: string;
  ctaPrimary: string;
  ctaSecondary: string;
  sectionTitle: string;
  sectionLead: string;
  ctaTitle: string;
  cards: Card[];
}

const CONTENT: Record<Locale, Content> = {
  ja: {
    heroLead: "いま、地球が何を検索しているか。\n流れる言葉は、すべて現在進行形の急上昇ワード。",
    heroGiant: "地球のトレンド",
    ctaPrimary: "世界のトレンドを見る",
    ctaSecondary: "これは何？",
    sectionTitle: "3つの視点で、世界の好奇心を探る",
    sectionLead: "急上昇の一覧から、連想の枝、地球儀まで。\n同じデータを違う角度で。",
    ctaTitle: "世界の好奇心を、\n覗いてみる。",
    cards: [
      {
        key: "trends",
        title: "トレンド",
        body: "円の大きさは検索ボリューム、色は燃え始めの新しさ。9カ国の急上昇を一枚の地図で。",
        path: "/trends",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        title: "分析",
        body: "急上昇ワードを起点に、人々が次に検索する言葉へ。枝をたどると関心の流れが見える。",
        path: "/analysis",
        visual: <AnalysisPreview />,
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
    heroLead: "What Earth is searching right now. Every word drifting by is a live, rising search.",
    heroGiant: "EARTH TRENDS",
    ctaPrimary: "See world trends",
    ctaSecondary: "What is this?",
    sectionTitle: "Explore the world's curiosity from three angles",
    sectionLead: "From rising searches to associative branches and the globe. The same data, different views.",
    ctaTitle: "Look into the world's curiosity.",
    cards: [
      {
        key: "trends",
        title: "Trends",
        body: "Circle size is search volume, color is how freshly it ignited. Nine countries' rising searches on one map.",
        path: "/trends",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        title: "Analysis",
        body: "Start from a rising word and follow what people search next. Trace the branches, see the flow of attention.",
        path: "/analysis",
        visual: <AnalysisPreview />,
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

// 全国分のトレンドから、マーキー用にワードを国横断でラウンドロビン抽出(重複除去)。
async function heroWords(): Promise<string[]> {
  const data = await getGalleryData();
  const lists = data.map(([, items]) => items.map((it) => it.word).filter(Boolean));
  const seen = new Set<string>();
  const out: string[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max && out.length < 90; i++) {
    for (const l of lists) {
      const w = l[i];
      if (w && !seen.has(w)) {
        seen.add(w);
        out.push(w);
      }
    }
  }
  return out;
}

// ブランドのトップ(/)。各ビューを説明も兼ねて見せる入口ページ(Vercel調・モノクロ基調)。
export default async function LandingPage({ locale }: { locale: Locale }) {
  const c = CONTENT[locale];
  const year = new Date().getFullYear();
  const words = await heroWords();
  return (
    <>
      <SiteHeader locale={locale} />

      <section className="lp-hero-full">
        <HeroMarquee words={words} />
        <div className="lp-hero-scrim" />
        <div className="lp-hero-overlay lp-container">
          <p className="lp-hero-lead" style={{ whiteSpace: "pre-line" }}>
            {c.heroLead}
          </p>
          <Link className="lp-hero-link" href={localePath(locale, "/trends")}>
            {c.ctaPrimary} →
          </Link>
          <h1 className="lp-hero-giant">{c.heroGiant}</h1>
        </div>
      </section>

      <div className="lp-section-head">
        <h2 className="lp-h2">{c.sectionTitle}</h2>
        <p className="lp-lead" style={{ whiteSpace: "pre-line" }}>
          {c.sectionLead}
        </p>
      </div>

      <section className="lp-cards">
        {c.cards.map((card) => (
          <Link className="lp-card" key={card.key} href={localePath(locale, card.path)}>
            <div className="lp-card-visual">{card.visual}</div>
            <div className="lp-card-text">
              <h3 className="lp-h3">{card.title}</h3>
              <p className="lp-body">{card.body}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="lp-cta lp-container">
        <h2 className="lp-h2" style={{ whiteSpace: "pre-line" }}>
          {c.ctaTitle}
        </h2>
        <Link className="lp-btn lp-btn-primary" href={localePath(locale, "/trends")}>
          {c.ctaPrimary}
        </Link>
      </section>

      <footer className="lp-footer">
        <span className="muted">
          © {year} {SITE_NAME}
        </span>
        <span className="lp-foot-links">
          <Link className="muted" href={localePath(locale, "/about")}>
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
