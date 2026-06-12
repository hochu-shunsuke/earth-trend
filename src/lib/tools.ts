// ツール追加時はここに1エントリ足すだけでトップのカードとsitemapに反映される
export interface Tool {
  slug: string;
  name: string;
  description: string;
}

export const TOOLS: Tool[] = [
  {
    slug: "line-stamp",
    name: "LINEスタンプ一括コンバーター",
    description:
      "申請用画像を370×320・透過PNG・偶数pxに一括変換。審査前チェックと規定ファイル名のZIP出力まで全自動。",
  },
];
