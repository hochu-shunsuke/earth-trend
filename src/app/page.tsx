import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export default function Home() {
  return (
    <main className="px-4 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{SITE_NAME}</h1>
        <p className="mt-4 text-gray-600">
          日本のクリエイター向け規格(スタンプ申請・入稿など)に特化した無料ツール集。
          <br />
          すべてブラウザ内で処理され、ファイルがサーバーへ送信されることはありません。
        </p>
      </header>

      <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/${tool.slug}`}
              className="block h-full rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="font-bold text-emerald-700">{tool.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{tool.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
