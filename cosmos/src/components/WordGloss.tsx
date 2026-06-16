"use client";

import { useEffect, useState } from "react";

// トレンド語の訳グロス「— 日本語」。SSRで温済の訳(initial)があれば即HTMLに出る(SEO/チラ無し)。
// 無ければハイドレート後に /api/translate(rate-limited・自己キャッシュ)で埋める=取りこぼし回収。
// NewsTitle と同じ機構。原語(語そのもの)は呼び出し側が常に別途表示している前提。
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
  const [tr, setTr] = useState<string | null>(initial ?? null);
  useEffect(() => {
    if (tr || !from || from === to || from === "auto") return; // 既にある/不要ならliveしない
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
  }, [word, from, to, tr]);
  if (!tr) return null;
  return (
    <>
      <span className="muted"> — </span>
      <span style={{ color: "var(--fg)", fontWeight: 500 }}>{tr}</span>
    </>
  );
}
