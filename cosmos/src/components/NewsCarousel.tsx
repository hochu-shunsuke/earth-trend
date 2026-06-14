// 記事を横スワイプのスライドにする(縦に積まずコンパクト)。各スライドは数行でクランプ、
// 次のスライドがチラ見え=スワイプできると分かる。URLが無ければGoogle検索にフォールバック。
interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

export default function NewsCarousel({
  news,
  translated,
}: {
  news: NewsItem[];
  translated?: (string | null)[] | null;
}) {
  const items = news.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        margin: "8px -2px 0",
        padding: "0 2px 4px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((n, i) => {
        const title = translated?.[i] ?? n.title;
        const href = n.url ?? `https://www.google.com/search?q=${encodeURIComponent(n.title)}`;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={n.title}
            style={{
              flex: items.length > 1 ? "0 0 86%" : "0 0 100%",
              scrollSnapAlign: "start",
              fontSize: 13,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
            {n.source && (
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {" "}
                ({n.source})
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
