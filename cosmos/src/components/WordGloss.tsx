"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";

// トレンド語の訳グロス「— 日本語」。SSRで温済の訳(initial)があれば即HTMLに出る(SEO/チラ無し)。
// 無ければハイドレート後、ビューポート近くに来たら /api/translate(rate-limited・自己キャッシュ)で
// 埋める=取りこぼし回収。可視範囲だけ訳すので初期バーストを抑える。NewsTitle と同じ機構。
// 原語(語そのもの)は呼び出し側が常に別途表示している前提。
export default function WordGloss({
  word,
  from,
  to,
  initial,
}: {
  word: string;
  from: string;
  to: string;
  initial?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [tr, setTr] = useState<string | null>(initial ?? null);
  useEffect(() => {
    if (tr || !inView || !from || from === to || from === "auto") return; // 既訳/範囲外/不要はしない
    let alive = true;
    fetch(`/api/translate?q=${encodeURIComponent(word)}&from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : { translated: null }))
      .then((d) => {
        if (alive) setTr((d.translated as string | null) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [inView, tr, word, from, to]);
  // 訳が来るまでは観測用の空アンカーを置く(これがビューポートに入ったらfetchが走る)
  if (!tr) return <span ref={ref} aria-hidden="true" />;
  return (
    <>
      <span className="muted"> — </span>
      <span style={{ color: "var(--fg)", fontWeight: 500 }}>{tr}</span>
    </>
  );
}
