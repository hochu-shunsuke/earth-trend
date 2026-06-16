"use client";

import { useEffect, useState } from "react";

// 国別ページのニュース見出し。SSRでは原語のまま出る(=一次HTML/SEOは原語)。
// ハイドレート後にUIロケールへ訳す(訳が来たら差し替え、原文はtitle属性=hoverで原文)。
// 訳は/api/translate(ブラウザ+CDN+Upstashの全段キャッシュ)流用でコストほぼゼロ。
export default function NewsTitle({
  title,
  from,
  to,
}: {
  title: string;
  from: string;
  to: string;
}) {
  const [tr, setTr] = useState<string | null>(null);
  useEffect(() => {
    if (!from || from === to || from === "auto") return; // 同言語/不明は訳さない
    let alive = true;
    fetch(`/api/translate?q=${encodeURIComponent(title)}&from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : { translated: null }))
      .then((d) => {
        if (alive) setTr((d.translated as string | null) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [title, from, to]);
  return <span title={tr ? title : undefined}>{tr ?? title}</span>;
}
