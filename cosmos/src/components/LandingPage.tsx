import Link from "next/link";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { TrendsPreview, BranchPreview, GlobePreview, HeroBubbles } from "@/components/landing/Visuals";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

interface Feature {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  link: string;
  path: string; // /[locale] からの相対
  visual: ReactNode;
}
interface Content {
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  bandTitle: string;
  features: Feature[];
}

const CONTENT: Record<Locale, Content> = {
  ja: {
    eyebrow: "検索トレンドの可視化",
    heroTitle: "世界の「知りたい」を、ひとつの生きた地図に。",
    heroLead:
      "いま世界が何に注意を向け、その関心がどう繋がっているか。検索という人類のいちばん正直な記録を、4つの視点で探索できます。",
    ctaPrimary: "世界のトレンドを見る",
    ctaSecondary: "これは何？",
    bandTitle: "世界の好奇心を、覗いてみる。",
    features: [
      {
        key: "trends",
        eyebrow: "トレンド",
        title: "いま、世界の検索",
        body: "円の大きさは検索ボリューム、色は燃え始めの新しさ。9カ国の急上昇を一枚の地図で眺める。",
        link: "トレンドを開く",
        path: "",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        eyebrow: "分析",
        title: "連想を辿る",
        body: "急上昇ワードを起点に、人々が次に検索する言葉へ。枝をたどると、関心の流れが見えてくる。",
        link: "分析を開く",
        path: "/analysis",
        visual: <BranchPreview />,
      },
      {
        key: "quest",
        eyebrow: "探求",
        title: "人類の問い",
        body: "「なぜ私は」「どうすれば」——半分打たれた問いの続きを、世界の検索が継いでいく。集合的無意識を覗く鏡。",
        link: "探求を開く",
        path: "/quest",
        visual: <BranchPreview />,
      },
      {
        key: "globe",
        eyebrow: "地球儀",
        title: "地球儀で俯瞰",
        body: "世界の関心を、回る地球の上に。どの国がいま何に沸いているかを一望する。",
        link: "地球儀を開く",
        path: "/globe",
        visual: <GlobePreview />,
      },
    ],
  },
  en: {
    eyebrow: "Search trends, visualized",
    heroTitle: "The world's curiosity, as one living map.",
    heroLead:
      "What the world is paying attention to right now, and how that curiosity connects — explore search, humanity's most honest record, from four angles.",
    ctaPrimary: "See world trends",
    ctaSecondary: "What is this?",
    bandTitle: "Look into the world's curiosity.",
    features: [
      {
        key: "trends",
        eyebrow: "Trends",
        title: "What the world searches now",
        body: "Circle size is search volume, color is how freshly it ignited. Nine countries' rising searches on one map.",
        link: "Open Trends",
        path: "",
        visual: <TrendsPreview />,
      },
      {
        key: "analysis",
        eyebrow: "Analysis",
        title: "Trace the associations",
        body: "Start from a rising word and follow what people search next. Trace the branches, and the flow of attention appears.",
        link: "Open Analysis",
        path: "/analysis",
        visual: <BranchPreview />,
      },
      {
        key: "quest",
        eyebrow: "Quest",
        title: "Humanity's questions",
        body: "“Why am I”, “how do I” — the half-typed questions continued by the world's searches. A mirror onto the collective unconscious.",
        link: "Open Quest",
        path: "/quest",
        visual: <BranchPreview />,
      },
      {
        key: "globe",
        eyebrow: "Globe",
        title: "See it from above",
        body: "The world's attention on a turning globe. See at a glance which country is buzzing about what.",
        link: "Open Globe",
        path: "/globe",
        visual: <GlobePreview />,
      },
    ],
  },
};

// ブランドのトップ(/)。各ビューを説明も兼ねて見せる入口ページ(Vercel/Supabase調)。
export default function LandingPage({ locale }: { locale: Locale }) {
  const c = CONTENT[locale];
  const year = new Date().getFullYear();
  return (
    <>
      <SiteHeader locale={locale} />

      <section className="lp-hero">
        {/* 右から画面外にはみ出す大きい丸の集合 */}
        <div className="lp-hero-bubbles" aria-hidden="true">
          <HeroBubbles />
        </div>
        <div className="lp-container">
          <div className="lp-hero-copy">
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
          </div>
        </div>
      </section>

      <section className="lp-features">
        {c.features.map((f) => (
          <div className="lp-feature" key={f.key}>
            <div className="lp-feature-copy">
              <p className="lp-eyebrow">{f.eyebrow}</p>
              <h2 className="lp-h2">{f.title}</h2>
              <p className="lp-body">{f.body}</p>
              <Link className="lp-link" href={`/${locale}${f.path}`}>
                {f.link} →
              </Link>
            </div>
            <div className="lp-feature-visual">
              <span className="lp-glow" />
              {f.visual}
            </div>
          </div>
        ))}
      </section>

      <section className="lp-cta-band">
        <div className="lp-container">
          <h2 className="lp-h2">{c.bandTitle}</h2>
          <Link className="lp-btn lp-btn-primary" href={`/${locale}`}>
            {c.ctaPrimary}
          </Link>
        </div>
      </section>

      <footer className="lp-footer lp-container">
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
