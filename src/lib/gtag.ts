// GA4カスタムイベント送信。Analytics(gtag.js)未読込/SSRでは何もしない。
export function gaEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("event", name, params);
}
