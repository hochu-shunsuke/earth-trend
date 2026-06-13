"use client";

import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";

function resolve(p: Pref): "light" | "dark" {
  if (p === "light" || p === "dark") return p;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  // 既定はシステム(OS設定に追従)
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Pref) || "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref(stored);
    // システム選択中はOSのテーマ変更に追従する
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (((localStorage.getItem("theme") as Pref) || "system") === "system") {
        document.documentElement.dataset.theme = resolve("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const change = (p: Pref) => {
    setPref(p);
    try {
      localStorage.setItem("theme", p);
    } catch {
      /* private mode等は無視 */
    }
    document.documentElement.dataset.theme = resolve(p);
  };

  return (
    <select
      className="btn"
      value={pref}
      onChange={(e) => change(e.target.value as Pref)}
      aria-label="テーマ"
    >
      <option value="system">システム</option>
      <option value="light">ライト</option>
      <option value="dark">ダーク</option>
    </select>
  );
}
