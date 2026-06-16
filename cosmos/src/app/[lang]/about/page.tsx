import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SITE_OPERATOR,
  SITE_EMAIL,
  SITE_GITHUB,
} from "@/lib/site";
import { toLocale, localePath, altLanguages } from "@/lib/i18n";

const CONTENT = {
  ja: {
    title: "このサイトについて",
    desc: `${SITE_NAME}は何か、データの出どころ、プライバシーについて。`,
    tagline: SITE_TAGLINE,
    whatTitle: "これは何か",
    what: `検索は、人類が最も正直に「知りたい」を吐き出している記録です。${SITE_NAME}は、いま世界が何に注意を向け、その関心がどう繋がっているかを、生きたグラフとして眺めるための場所です。数字を分析するツールというより、世界の好奇心を覗く鏡のようなものです。`,
    views: [
      ["トレンド", "いま世界が検索していること"],
      ["分析", "急上昇ワードから連想を辿る"],
      ["地球儀", "世界の関心を俯瞰する"],
    ],
    whyTitle: "なぜ作ったか",
    why: "このプロジェクトは、機能よりも先に「思想」から始まりました。いまのSNSや検索はパーソナライズされすぎて、自分の鏡しか映してくれない。かといって Google トレンドは無機質な表でしかない。世界の人々の関心の流れを、もっと楽しく、違う角度から眺めたかった——そして、データの見せ方そのものに挑戦したかった。これはその試みです。これからも「何のためのサイトか」を問い直しながら、更新を続けていきます。",
    dataTitle: "データについて",
    data: `表示しているのは Google トレンド(急上昇検索)と Google の検索オートコンプリート(サジェスト)から取得した公開データで、一定時間ごとにキャッシュして取得しています(各国を10分ごと)。語の翻訳は機械翻訳、円の大きさ=検索ボリューム、色=登場からの新しさ、という独自の表現で並べています。本サイトは Google LLC・各社とは一切関係のない、個人による非公式なプロジェクトです。`,
    operatorTitle: "運営",
    operator: `個人プロジェクトとして ${SITE_OPERATOR} が運営しています。ご意見・ご指摘・不具合報告は歓迎です。`,
    privacyTitle: "プライバシー",
    privacy:
      "アカウント登録はなく、あなたの個人情報を保存することはありません。サイト改善のため、アクセス状況の匿名的な統計(Google Analytics)を利用する場合があります。",
  },
  en: {
    title: "About",
    desc: `What ${SITE_NAME} is, where the data comes from, and privacy.`,
    tagline: "The world's trends, as a living map.",
    whatTitle: "What is this",
    what: `Search is humanity's most honest record of "what we want to know." ${SITE_NAME} is a place to watch what the world is paying attention to right now, and how that curiosity connects — as a living graph. Less an analytics tool, more a mirror onto the world's curiosity.`,
    views: [
      ["Trends", "What the world is searching right now"],
      ["Analysis", "Trace associations out from a rising word"],
      ["Globe", "See the world's attention from above"],
    ],
    whyTitle: "Why I made this",
    why: "This project began with a philosophy, not a feature. Today's social feeds and search are so personalized they mostly reflect ourselves; Google Trends, meanwhile, is just a sterile table. I wanted to watch the flow of the world's collective attention from a different, more playful angle — and to experiment with how data itself can be expressed. This is that attempt. I'll keep updating it while continually rethinking what it's for.",
    dataTitle: "About the data",
    data: `We show public data from Google Trends (trending searches) and Google search autocomplete (suggestions), fetched and cached at regular intervals (every 10 minutes per country). Words are machine-translated, and we arrange them with our own encoding: circle size = search volume, color = how recently it appeared. This is an unofficial personal project, not affiliated with Google LLC or any company.`,
    operatorTitle: "Who runs this",
    operator: `An independent personal project run by ${SITE_OPERATOR}. Feedback, corrections and bug reports are welcome.`,
    privacyTitle: "Privacy",
    privacy:
      "There is no sign-up, and we do not store your personal information. We may use anonymous usage statistics (Google Analytics) to improve the site.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  const c = CONTENT[locale];
  return {
    title: c.title,
    description: c.desc,
    alternates: {
      canonical: localePath(locale, "/about"),
      languages: altLanguages("/about"),
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = toLocale((await params).lang);
  const c = CONTENT[locale];
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

        <section style={{ marginTop: 24 }}>
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

        <p style={{ marginTop: 32 }}>
          <Link href={localePath(locale)}>← {SITE_NAME}</Link>
        </p>
      </main>
    </>
  );
}
