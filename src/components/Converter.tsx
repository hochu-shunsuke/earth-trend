"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  convertSticker,
  type CheckStatus,
  type ConvertedImage,
} from "@/lib/convert";
import { buildSubmissionZip } from "@/lib/zip";
import { MAX_COUNT, VALID_COUNTS } from "@/lib/specs";

const STATUS_STYLE: Record<CheckStatus, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  error: "text-red-600",
};

const STATUS_ICON: Record<CheckStatus, string> = {
  ok: "✓",
  warn: "△",
  error: "✕",
};

export default function Converter() {
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const accepted = Array.from(files).filter((f) =>
        /^image\/(png|jpeg|webp)$/.test(f.type),
      );
      if (accepted.length === 0) {
        setError("PNG / JPG / WebP の画像ファイルを入れてください");
        return;
      }
      setBusy(true);
      try {
        const converted: ConvertedImage[] = [];
        for (const file of accepted) {
          converted.push(await convertSticker(file));
        }
        setImages((prev) => {
          const next = [...prev, ...converted];
          if (next.length > MAX_COUNT) {
            setError(`スタンプは最大${MAX_COUNT}個までです。先頭${MAX_COUNT}個のみ保持しました`);
          }
          return next.slice(0, MAX_COUNT);
        });
      } catch {
        setError("変換に失敗した画像があります。ファイルが壊れていないか確認してください");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const remove = useCallback((index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setMainIndex((m) => (index < m ? m - 1 : Math.min(m, images.length - 2 < 0 ? 0 : images.length - 2)));
  }, [images.length]);

  const countCheck = useMemo(() => {
    if (images.length === 0) return null;
    const valid = (VALID_COUNTS as readonly number[]).includes(images.length);
    return valid
      ? { status: "ok" as const, text: `${images.length}個 — 申請可能な個数です` }
      : {
          status: "warn" as const,
          text: `現在${images.length}個。申請できるのは ${VALID_COUNTS.join(" / ")} 個のいずれかです`,
        };
  }, [images.length]);

  const hasBlocking = images.some((img) =>
    img.checks.some((c) => c.status === "error"),
  );

  const download = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const zip = await buildSubmissionZip(images, Math.min(mainIndex, images.length - 1));
      const url = URL.createObjectURL(zip);
      const a = document.createElement("a");
      a.href = url;
      a.download = "line-stickers.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("ZIPの生成に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [images, mainIndex]);

  return (
    <section className="w-full max-w-3xl mx-auto">
      {/* ドロップゾーン */}
      <div
        role="button"
        tabIndex={0}
        aria-label="画像を選択またはドロップ"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 bg-white hover:border-emerald-400"
        }`}
      >
        <p className="text-lg font-semibold text-gray-800">
          スタンプ画像をここにドロップ
        </p>
        <p className="mt-1 text-sm text-gray-500">
          またはクリックして選択(PNG / JPG / WebP、最大{MAX_COUNT}枚)
        </p>
        <p className="mt-3 text-xs text-gray-400">
          画像はブラウザ内で処理され、サーバーには一切送信されません
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {busy && (
        <p className="mt-4 text-center text-sm text-gray-500">処理中…</p>
      )}
      {error && (
        <p className="mt-4 text-center text-sm text-red-600">{error}</p>
      )}

      {images.length > 0 && (
        <>
          {/* 個数チェック */}
          {countCheck && (
            <p
              className={`mt-6 text-sm font-medium ${
                countCheck.status === "ok" ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {STATUS_ICON[countCheck.status]} {countCheck.text}
            </p>
          )}

          {/* 一覧 */}
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <li
                key={img.previewUrl}
                className={`rounded-xl border bg-white p-3 ${
                  i === mainIndex ? "border-emerald-500 ring-1 ring-emerald-500" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500">
                    {String(i + 1).padStart(2, "0")}.png
                  </span>
                  <button
                    onClick={() => remove(i)}
                    aria-label={`${img.sourceName}を削除`}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    削除
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.sourceName}
                  className="mx-auto mt-2 h-20 w-auto object-contain [background:repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)_0_0/16px_16px]"
                />
                <ul className="mt-2 space-y-0.5">
                  {img.checks.map((c) => (
                    <li
                      key={c.label}
                      className={`text-[11px] leading-tight ${STATUS_STYLE[c.status]}`}
                      title={c.detail}
                    >
                      {STATUS_ICON[c.status]} {c.label}: {c.detail}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setMainIndex(i)}
                  className={`mt-2 w-full rounded-md py-1 text-xs font-medium ${
                    i === mainIndex
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {i === mainIndex ? "メイン画像に設定中" : "メイン画像にする"}
                </button>
              </li>
            ))}
          </ul>

          {/* ダウンロード */}
          <div className="mt-8 text-center">
            <button
              onClick={download}
              disabled={busy || hasBlocking}
              className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-bold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              申請用ZIPをダウンロード
            </button>
            <p className="mt-2 text-xs text-gray-500">
              main.png / tab.png / 01.png〜 の規定ファイル名で書き出します
            </p>
            {hasBlocking && (
              <p className="mt-1 text-xs text-red-600">
                ✕のエラーがある画像を修正または削除してください
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
