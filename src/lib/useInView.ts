import { useEffect, useRef, useState } from "react";

// 要素がビューポート近く(rootMargin)に入ったら一度だけ true を返す。重い処理(翻訳fetch等)を
// 可視範囲に限定して初期リクエストのバーストを抑える。IntersectionObserver未対応/未マウント時は
// 即 true(=従来通り全部処理。劣化しない)。
export function useInView<T extends Element>(rootMargin = "300px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);
  return { ref, inView };
}
