import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import {
  SITE_NAME,
  SITE_URL,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_OPERATOR,
  SITE_EMAIL,
  SITE_GITHUB,
  jsonLd,
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
    faqTitle: "よくある質問",
    faq: [
      [
        "データはリアルタイムですか?",
        "完全なリアルタイムではありません。各国のデータを10分ごとにキャッシュして取得・表示しています。提供元(Google)へ礼儀正しくアクセスするための設計です。",
      ],
      [
        "何カ国に対応していますか?",
        "24カ国です。日本・アメリカ・イギリス・インド・韓国・台湾・ドイツ・フランス・ブラジルなどを起点に、英語圏・スペイン語圏・主要国へ広げています。",
      ],
      [
        "Google 公式のサービスですか?",
        "いいえ。Google LLC とは一切関係のない、個人による非公式なプロジェクトです。公開されている Google トレンド/オートコンプリートのデータを独自に可視化しています。",
      ],
      [
        "Google トレンドと何が違いますか?",
        "数字を分析するツールというより、世界の好奇心を眺める鏡です。円の大きさ=検索ボリューム、色=登場からの新しさ、という独自の表現で、関心の「いま」と繋がりを感じ取れるようにしています。",
      ],
      [
        "表示される大きさや順位は正確な数値ですか?",
        "相対的な表現です。円の大きさは検索ボリュームの大小を表しますが、全検索に占める割合ではありません。",
      ],
    ] as [string, string][],
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
    faqTitle: "FAQ",
    faq: [
      [
        "Is the data real-time?",
        "Not strictly real-time. Each country's data is fetched and cached every 10 minutes — a design choice to stay polite to the source (Google).",
      ],
      [
        "How many countries are covered?",
        "24 countries. Starting from Japan, the US, the UK, India, South Korea, Taiwan, Germany, France and Brazil, we keep expanding across the English- and Spanish-speaking world and major markets.",
      ],
      [
        "Is this an official Google service?",
        "No. It's an unofficial personal project with no affiliation to Google LLC. We independently visualize public data from Google Trends and search autocomplete.",
      ],
      [
        "How is this different from Google Trends?",
        "Less an analytics tool, more a mirror onto the world's curiosity. With our own encoding — circle size = search volume, color = how recently a word appeared — you can feel the 'now' of attention and how it connects.",
      ],
      [
        "Are the sizes and rankings exact numbers?",
        "They're relative. Circle size reflects the relative magnitude of search volume, not a share of all searches.",
      ],
    ] as [string, string][],
  },
  es: {
    title: "Acerca de",
    desc: `Qué es ${SITE_NAME}, de dónde vienen los datos y la privacidad.`,
    tagline: "Las tendencias del mundo, como un mapa vivo.",
    whatTitle: "Qué es esto",
    what: `La búsqueda es el registro más honesto de la humanidad sobre "lo que queremos saber". ${SITE_NAME} es un lugar para observar a qué presta atención el mundo en este momento, y cómo se conecta esa curiosidad — como un grafo vivo. Más que una herramienta de análisis, es un espejo de la curiosidad del mundo.`,
    views: [
      ["Tendencias", "Lo que el mundo busca ahora mismo"],
      ["Análisis", "Sigue las asociaciones a partir de una palabra en auge"],
      ["Globo", "Mira la atención del mundo desde arriba"],
    ],
    whyTitle: "Por qué lo creé",
    why: "Este proyecto nació de una idea, no de una función. Hoy las redes sociales y los buscadores están tan personalizados que casi solo nos reflejan a nosotros mismos; Google Trends, por su parte, no es más que una tabla fría. Quería observar el flujo de la atención colectiva del mundo desde un ángulo distinto y más lúdico — y experimentar con cómo se pueden expresar los datos. Este es ese intento. Lo seguiré actualizando mientras me replanteo continuamente para qué sirve.",
    dataTitle: "Sobre los datos",
    data: `Mostramos datos públicos de Google Trends (búsquedas en tendencia) y del autocompletado de Google (sugerencias), obtenidos y almacenados en caché a intervalos regulares (cada 10 minutos por país). Las palabras se traducen automáticamente y las disponemos con nuestra propia codificación: tamaño del círculo = volumen de búsqueda, color = qué tan reciente apareció. Este es un proyecto personal no oficial, sin relación alguna con Google LLC ni ninguna empresa.`,
    operatorTitle: "Quién lo gestiona",
    operator: `Un proyecto personal e independiente gestionado por ${SITE_OPERATOR}. Se agradecen comentarios, correcciones e informes de errores.`,
    privacyTitle: "Privacidad",
    privacy:
      "No hay registro de cuenta y no almacenamos tu información personal. Podemos usar estadísticas de uso anónimas (Google Analytics) para mejorar el sitio.",
    faqTitle: "Preguntas frecuentes",
    faq: [
      [
        "¿Los datos son en tiempo real?",
        "No exactamente en tiempo real. Los datos de cada país se obtienen y se almacenan en caché cada 10 minutos, una decisión de diseño para acceder con cortesía a la fuente (Google).",
      ],
      [
        "¿Cuántos países cubre?",
        "24 países. Partiendo de Japón, Estados Unidos, Reino Unido, India, Corea del Sur, Taiwán, Alemania, Francia y Brasil, seguimos ampliando hacia el mundo angloparlante e hispanohablante y los mercados principales.",
      ],
      [
        "¿Es un servicio oficial de Google?",
        "No. Es un proyecto personal no oficial, sin relación alguna con Google LLC. Visualizamos de forma independiente datos públicos de Google Trends y del autocompletado de búsqueda.",
      ],
      [
        "¿En qué se diferencia de Google Trends?",
        "Más que una herramienta de análisis, es un espejo de la curiosidad del mundo. Con nuestra propia codificación — tamaño del círculo = volumen de búsqueda, color = qué tan reciente apareció — puedes sentir el 'ahora' de la atención y cómo se conecta.",
      ],
      [
        "¿Los tamaños y posiciones son cifras exactas?",
        "Son relativos. El tamaño del círculo refleja la magnitud relativa del volumen de búsqueda, no una proporción de todas las búsquedas.",
      ],
    ] as [string, string][],
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
          <Link href={localePath(locale)}>← {SITE_NAME}</Link>
        </p>
      </main>
    </>
  );
}
