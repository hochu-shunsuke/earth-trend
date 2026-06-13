import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: `${SITE_NAME}は何か、データの出どころ、プライバシーについて。`,
};

export default function AboutPage() {
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
        <p className="muted" style={{ marginTop: 4 }}>{SITE_TAGLINE}</p>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>これは何か</h2>
          <p>
            検索は、人類が最も正直に「知りたい」を吐き出している記録です。{SITE_NAME}
            は、いま世界が何に注意を向け、その関心がどう繋がっているかを、生きたグラフとして眺めるための場所です。
            数字を分析するツールというより、世界の好奇心を覗く鏡のようなものです。
          </p>
          <ul>
            <li><strong>脈拍</strong> — いま世界が検索していること</li>
            <li><strong>探求</strong> — 人類が密かに問うていること(自分の問いを起点に潜れます)</li>
            <li><strong>分析</strong> — 急上昇ワードから連想を辿る</li>
            <li><strong>地球儀</strong> — 世界の関心を俯瞰する</li>
          </ul>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>データについて</h2>
          <p>
            表示しているのは Google トレンド(急上昇検索)と Google
            の検索オートコンプリート(サジェスト)から取得した公開データで、一定時間ごとにキャッシュして取得しています。
            本サイトは Google
            LLC・各社とは一切関係のない、個人による非公式なプロジェクトです。
          </p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>プライバシー</h2>
          <p>
            アカウント登録はなく、あなたの個人情報を保存することはありません。
            サイト改善のため、アクセス状況の匿名的な統計(Google Analytics)を利用する場合があります。
          </p>
        </section>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>つらいときは</h2>
          <p>
            検索のなかには、苦しい気持ちに触れる言葉もあります。{SITE_NAME}
            では、そうした検索を面白がるように扱うことはしません。ひとりで抱えきれないと感じたら、
            どうか専門の窓口を頼ってください。
          </p>
          <p>
            <a href="https://www.inochinodenwa.org/" target="_blank" rel="noopener noreferrer">
              いのちの電話
            </a>
            {" / "}
            <a href="https://findahelpline.com/" target="_blank" rel="noopener noreferrer">
              Find a Helpline(海外)
            </a>
          </p>
        </section>

        <p style={{ marginTop: 32 }}>
          <Link href="/">← {SITE_NAME} に戻る</Link>
        </p>
      </main>
    </>
  );
}
