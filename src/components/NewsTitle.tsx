"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";

// 国別ページのニュース見出し。SSRでは原語のまま出る(=一次HTML/SEOは原語)。
// ハイドレート後、ビューポート近くに来たらUIロケールへ訳す(訳が来たら差し替え、原文はtitle属性=
// hoverで原文)。可視範囲だけ訳すので初期リクエストのバーストを抑える。訳は/api/translate
// (ブラウザ+CDN+Upstashの全段キャッシュ・rate-limited)流用でコストほぼゼロ。
export default function NewsTitle({
  title,
  from,
  to,
  initial,
}: {
  title: string;
  from: string;
  to: string;
  /** SSRで温済の訳。あればクライアントからの /api/translate は走らない */
  initial?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [tr, setTr] = useState<string | null>(initial ?? null);
  useEffect(() => {
    if (!inView || tr || !from || from === to || from === "auto") return; // 範囲外/既訳/不要はしない
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
  }, [inView, tr, title, from, to]);
  return (
    <span ref={ref} title={tr ? title : undefined}>
      {tr ?? title}
    </span>
  );
}
