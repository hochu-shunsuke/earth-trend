import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { SITE_NAME, SITE_URL, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/site";

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
        {/* テーマ初期化(FOUC防止)＋ <html lang> をURL先頭セグメントに合わせる */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("theme")||"system";var sysDark=matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=(p==="light"||p==="dark")?p:(sysDark?"dark":"light");var s=location.pathname.split("/")[1];if(s==="ja"||s==="en")document.documentElement.lang=s;}catch(e){document.documentElement.dataset.theme="dark";}})()`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
