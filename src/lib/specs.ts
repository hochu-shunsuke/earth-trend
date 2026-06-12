// LINE Creators Market 公式ガイドライン(2026-06確認)に基づく規格値
// https://creator.line.me/ja/guideline/sticker/

export const STICKER_MAX_W = 370;
export const STICKER_MAX_H = 320;
/** コンテンツ外周に約10pxの余白が推奨されるため、実描画領域はこの値だけ内側に取る */
export const STICKER_MARGIN = 10;

export const MAIN_W = 240;
export const MAIN_H = 240;

export const TAB_W = 96;
export const TAB_H = 74;

/** 各画像のファイルサイズ上限(バイト) */
export const MAX_FILE_BYTES = 1024 * 1024;

/** 申請可能なスタンプ個数 */
export const VALID_COUNTS = [8, 16, 24, 32, 40] as const;
export const MAX_COUNT = 40;
