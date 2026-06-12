import { zipSync } from "fflate";
import { MAIN_W, MAIN_H, TAB_W, TAB_H } from "./specs";
import { convertFixed, type ConvertedImage } from "./convert";

/**
 * LINE Creators Market(Web版)申請用ZIPを生成する。
 * 構成: main.png / tab.png / 01.png〜NN.png
 * mainIndex はメイン・タブ画像の元にするスタンプのインデックス。
 */
export async function buildSubmissionZip(
  images: ConvertedImage[],
  mainIndex: number,
): Promise<Blob> {
  const source = images[mainIndex].blob;
  const [main, tab] = await Promise.all([
    convertFixed(source, MAIN_W, MAIN_H),
    convertFixed(source, TAB_W, TAB_H),
  ]);

  const entries: Record<string, Uint8Array> = {
    "main.png": new Uint8Array(await main.arrayBuffer()),
    "tab.png": new Uint8Array(await tab.arrayBuffer()),
  };
  await Promise.all(
    images.map(async (img, i) => {
      const name = `${String(i + 1).padStart(2, "0")}.png`;
      entries[name] = new Uint8Array(await img.blob.arrayBuffer());
    }),
  );

  // PNGは圧縮済みのためSTORE(level 0)で十分
  const zipped = zipSync(entries, { level: 0 });
  return new Blob([zipped], { type: "application/zip" });
}
