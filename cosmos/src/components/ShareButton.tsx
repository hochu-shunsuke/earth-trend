"use client";

import { useState } from "react";
import { t, localePath, type Locale } from "@/lib/i18n";

// 共有ボタン: ネイティブ共有(モバイル)→ダメならリンクコピー。画像保存はOG画像へのDLリンク。
// 共有リンクは現在の(=利用者の言語の)URLなので、受け手もその言語で着地する。
export default function ShareButton({
  locale,
  geo,
  title,
}: {
  locale: Locale;
  geo: string;
  title: string;
}) {
  const d = t(locale);
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* キャンセル等は無視 */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard不可は無視 */
    }
  };

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button
        className="btn"
        onClick={onShare}
        type="button"
        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 15V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
        </svg>
        {copied ? d.share.copied : d.share.button}
      </button>
      <a
        className="btn"
        href={localePath(locale, `/${geo.toLowerCase()}/opengraph-image`)}
        download={`earth-trend-${geo.toLowerCase()}.png`}
      >
        {d.share.image}
      </a>
    </span>
  );
}
