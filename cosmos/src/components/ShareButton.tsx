"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

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
      <button className="btn" onClick={onShare} type="button">
        {copied ? d.share.copied : `${d.share.button} ↗`}
      </button>
      <a
        className="btn"
        href={`/${locale}/${geo.toLowerCase()}/opengraph-image`}
        download={`earth-trend-${geo.toLowerCase()}.png`}
      >
        {d.share.image}
      </a>
    </span>
  );
}
