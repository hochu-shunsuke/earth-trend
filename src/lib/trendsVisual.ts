// トレンド可視化の純粋ヘルパー(サーバー/クライアント両用)。"use client"を付けない。

export function parseTraffic(t: string): number {
  // "50,000+" や "5万+" 等。数字だけ拾う(万は概算で桁を足す)
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10) || 0;
  return /万/.test(t) ? n * 10000 : n;
}

// 色＝新しさ(発生からの経過)。新しいほど暖色、古いほど寒色。
// サイズ=規模 と直交する2次元目。firstSeen不明時は中立の青
// dl: 明度デルタ(負で暗く) / sat: 彩度。ライト背景にテキストを直接載せる用途(地球儀)では
// 「暗く+高彩度」で深いジュエルトーンにすると濁らず締まる。
export function freshnessColor(firstSeen: number | undefined, nowSec: number, dl = 0, sat = 70): string {
  if (!firstSeen) return `hsl(212 ${sat}% ${44 + dl}%)`;
  const ageH = Math.max(0, (nowSec - firstSeen) / 3600);
  const t = Math.min(1, ageH / 24); // 0(新しい)..1(24h以上で古い)
  const hue = Math.round(28 + t * (212 - 28)); // 28(暖)→212(寒)
  const light = Math.round(52 - t * 12) + dl;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
