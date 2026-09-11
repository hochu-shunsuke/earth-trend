import SiteHeader from "@/components/SiteHeader";
import GalleryGrid from "@/components/GalleryGrid";
import SiteFooter from "@/components/SiteFooter";
import { getGalleryTiles } from "@/lib/gallery-data";
import { COPY } from "@/lib/copy";

// 各国の「注意の地図」一覧 = ホーム。
export default async function Gallery() {
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  const data = await getGalleryTiles(); // 表示に使う3項目だけ(ニュースをクライアントへ送らない)

  return (
    <>
      <SiteHeader />
      <main style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "72px 16px 48px" }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{COPY.home.title}</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {COPY.home.desc}
          </p>
        </header>

        <GalleryGrid initial={data} nowSec={nowSec} />

        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          {COPY.home.legendFooter}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
