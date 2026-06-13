import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://earth-trend.vercel.app"),
  title: {
    default: "earth-trend — 世界の検索を、脈拍と問いとして",
    template: "%s | earth-trend",
  },
  description:
    "いま世界が何を検索しているか(脈拍)、そして人類が何を密かに問うているか(問い)を、生きたグラフとして探索する。",
  openGraph: {
    siteName: "earth-trend",
    type: "website",
    locale: "ja_JP",
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
        {/* テーマ初期化(FOUC防止): localStorage→OS設定の順で決める */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})()`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
