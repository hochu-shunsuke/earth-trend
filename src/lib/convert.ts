import {
  STICKER_MAX_W,
  STICKER_MAX_H,
  STICKER_MARGIN,
  MAX_FILE_BYTES,
} from "./specs";

export type CheckStatus = "ok" | "warn" | "error";

export interface CheckItem {
  status: CheckStatus;
  label: string;
  detail: string;
}

export interface ConvertedImage {
  /** 入力ファイル名 */
  sourceName: string;
  /** 変換後PNG */
  blob: Blob;
  width: number;
  height: number;
  /** サムネイル表示用 Object URL */
  previewUrl: string;
  /** 入力がアルファチャンネルを持たない形式(JPG等)だったか */
  opaqueSource: boolean;
  checks: CheckItem[];
}

function toEven(n: number): number {
  return n % 2 === 0 ? n : n - 1;
}

/**
 * 画像を maxW×maxH 以内・偶数px・透過PNGに変換する。
 * margin > 0 の場合、コンテンツを (maxW-2*margin)×(maxH-2*margin) に収め、
 * キャンバス自体はコンテンツ+余白ぶんの最小偶数サイズにする。
 */
async function renderToCanvas(
  bitmap: ImageBitmap,
  maxW: number,
  maxH: number,
  margin: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const contentMaxW = maxW - margin * 2;
  const contentMaxH = maxH - margin * 2;
  const scale = Math.min(
    contentMaxW / bitmap.width,
    contentMaxH / bitmap.height,
    1,
  );
  const contentW = Math.max(2, Math.round(bitmap.width * scale));
  const contentH = Math.max(2, Math.round(bitmap.height * scale));
  const width = toEven(contentW + margin * 2);
  const height = toEven(contentH + margin * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (width - contentW) / 2,
    (height - contentH) / 2,
    contentW,
    contentH,
  );
  return { canvas, width, height };
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG書き出しに失敗しました"))),
      "image/png",
    );
  });
}

function buildChecks(
  width: number,
  height: number,
  bytes: number,
  opaqueSource: boolean,
): CheckItem[] {
  const checks: CheckItem[] = [];
  checks.push({
    status: "ok",
    label: "サイズ",
    detail: `${width}×${height}px(規格内・偶数)`,
  });
  checks.push(
    bytes <= MAX_FILE_BYTES
      ? {
          status: "ok",
          label: "容量",
          detail: `${Math.round(bytes / 1024)}KB(1MB以下)`,
        }
      : {
          status: "error",
          label: "容量",
          detail: `${Math.round(bytes / 1024)}KBで1MBを超えています`,
        },
  );
  if (opaqueSource) {
    checks.push({
      status: "warn",
      label: "透過",
      detail:
        "元画像がJPG等のため背景が透過されていません。透過PNGで描き出した画像の使用を推奨します",
    });
  } else {
    checks.push({ status: "ok", label: "透過", detail: "アルファチャンネルあり" });
  }
  return checks;
}

async function convertWith(
  file: File,
  maxW: number,
  maxH: number,
  margin: number,
): Promise<ConvertedImage> {
  const opaqueSource = /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const bitmap = await createImageBitmap(file);
  try {
    const { canvas, width, height } = await renderToCanvas(
      bitmap,
      maxW,
      maxH,
      margin,
    );
    const blob = await canvasToPng(canvas);
    return {
      sourceName: file.name,
      blob,
      width,
      height,
      previewUrl: URL.createObjectURL(blob),
      opaqueSource,
      checks: buildChecks(width, height, blob.size, opaqueSource),
    };
  } finally {
    bitmap.close();
  }
}

/** スタンプ画像(最大370×320・余白10px)へ変換 */
export function convertSticker(file: File): Promise<ConvertedImage> {
  return convertWith(file, STICKER_MAX_W, STICKER_MAX_H, STICKER_MARGIN);
}

/**
 * 固定サイズ(main/tab)へ変換。キャンバスを固定し、コンテンツを内接配置する。
 */
export async function convertFixed(
  source: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(bitmap.width ? width / bitmap.width : 1, bitmap.height ? height / bitmap.height : 1);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
    return await canvasToPng(canvas);
  } finally {
    bitmap.close();
  }
}
