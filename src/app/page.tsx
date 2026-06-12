import Converter from "@/components/Converter";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <main className="px-4 py-12">
        {/* ヒーロー */}
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold leading-snug sm:text-4xl">
            LINEスタンプの申請画像を
            <br className="sm:hidden" />
            <span className="text-emerald-600">一括変換・審査前チェック</span>
          </h1>
          <p className="mt-4 text-gray-600">
            描くのはクリスタやProcreateで。申請準備はここで10秒。
            <br />
            370×320へのリサイズ、main/tab生成、規定ファイル名のZIP出力まで全自動。
          </p>
        </header>

        <div className="mt-10">
          <Converter />
        </div>

        {/* SEOコンテンツ */}
        <article className="prose prose-gray mx-auto mt-20 max-w-3xl prose-h2:text-xl">
          <h2>LINEスタンプの画像規格(2026年版・公式ガイドライン準拠)</h2>
          <table>
            <thead>
              <tr>
                <th>画像</th>
                <th>サイズ</th>
                <th>個数</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>スタンプ画像</td>
                <td>W370×H320px 以内</td>
                <td>8 / 16 / 24 / 32 / 40個</td>
              </tr>
              <tr>
                <td>メイン画像(main.png)</td>
                <td>W240×H240px</td>
                <td>1個</td>
              </tr>
              <tr>
                <td>トークルームタブ画像(tab.png)</td>
                <td>W96×H74px</td>
                <td>1個</td>
              </tr>
            </tbody>
          </table>
          <p>
            共通要件: PNG形式・背景透過・縦横ともに偶数ピクセル・各ファイル1MB以下・ZIP全体で60MB以下・解像度72dpi以上・カラーモードRGB。コンテンツと画像の端の間にはおよそ10pxの余白が推奨されています。
          </p>

          <h2>よくある審査リジェクトの原因</h2>
          <ul>
            <li>
              <strong>サイズが奇数ピクセル</strong> —
              手動リサイズで起こりがちです。本ツールは常に偶数pxで出力します。
            </li>
            <li>
              <strong>背景が透過されていない</strong> —
              JPGで書き出すとアルファチャンネルが失われます。透過PNGで書き出してから変換してください。
            </li>
            <li>
              <strong>余白がない・見切れている</strong> —
              コンテンツ外周に約10pxの余白が必要です。本ツールは余白を確保して配置します。
            </li>
            <li>
              <strong>ファイル名の不備</strong> — Web版LINE Creators
              Marketの一括アップロードは main.png / tab.png / 01.png〜
              の命名規則があります。本ツールのZIPはこの規則で出力されます。
            </li>
          </ul>

          <h2>このツールについて</h2>
          <p>
            すべての処理はお使いのブラウザの中だけで完結し、画像が外部サーバーへ送信されることはありません。通信が発生しないため高速で、作品が外部に渡る心配もありません。
          </p>
          <p className="text-sm">
            免責事項:
            本ツールは画像の機械的な変換のみを行うものであり、LINE社の審査の通過を保証するものではありません。規格は変更される場合があるため、申請前に
            <a
              href="https://creator.line.me/ja/guideline/sticker/"
              rel="noopener noreferrer"
              target="_blank"
            >
              公式ガイドライン
            </a>
            をご確認ください。本サイトはLINEヤフー株式会社とは関係のない個人運営のサービスです。
          </p>
        </article>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        © 2026 {SITE_NAME}
      </footer>
    </div>
  );
}
