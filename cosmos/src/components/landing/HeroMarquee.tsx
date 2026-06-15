// ヒーロー背景: いま急上昇している検索ワードが横に流れるマーキー。
// 純CSSアニメ(クライアントJS不要)。各行は全ワードを回転オフセットして二重化しシームレスループ。
const ROWS = 5;

function rotate<T>(arr: T[], n: number): T[] {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

export default function HeroMarquee({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  const rows = Array.from({ length: ROWS }, (_, i) => rotate(words, i * 7));
  return (
    <div className="lp-marquee" aria-hidden="true">
      {rows.map((row, i) => (
        <div className="lp-marquee-row" key={i} data-dir={i % 2 === 0 ? "l" : "r"}>
          <div className="lp-marquee-track" style={{ animationDuration: `${48 + i * 9}s` }}>
            {[...row, ...row].map((w, j) => (
              <span className="lp-marquee-word" key={j}>
                {w}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
