"use client";

import { useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => document.documentElement.dataset.theme ?? "dark";
const getServerSnapshot = () => null;

export default function ThemeToggle() {
  // 初期値はDOMから読み(SSR時はnull)、以後はクリックで上書き
  const initial = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [override, setOverride] = useState<string | null>(null);
  const theme = override ?? initial;

  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode等は無視 */
    }
    setOverride(next);
  };

  return (
    <button className="btn" onClick={toggle} aria-label="テーマ切替">
      {theme === null ? "…" : theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
