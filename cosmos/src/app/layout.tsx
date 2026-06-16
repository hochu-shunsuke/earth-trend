import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import {
  SITE_NAME,
  SITE_URL,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_GITHUB,
  jsonLd,
} from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 構造化データ(JSON-LD): サイト/運営主体の実体をGoogleに明示(最小限) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  inLanguage: ["ja", "en", "es"],
                  publisher: { "@id": `${SITE_URL}/#org` },
                },
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#org`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  description: SITE_TAGLINE,
                  // 運営実体のシグナル(E-E-A-T/Trust): 公開アカウント・連絡先
                  sameAs: [SITE_GITHUB],
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: SITE_EMAIL,
                    contactType: "customer support",
                  },
                },
              ],
            }),
          }}
        />
        {/* テーマ初期化(FOUC防止)＋ <html lang> をURL先頭セグメントに合わせる */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("theme")||"system";var sysDark=matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=(p==="light"||p==="dark")?p:(sysDark?"dark":"light");var s=location.pathname.split("/")[1];if(s==="ja"||s==="en"||s==="es")document.documentElement.lang=s;}catch(e){document.documentElement.dataset.theme="dark";}})()`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
