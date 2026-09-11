"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/lib/copy";

type Pref = "system" | "light" | "dark";

function resolve(p: Pref): "light" | "dark" {
  if (p === "light" || p === "dark") return p;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const d = COPY;
  // 既定はシステム(OS設定に追従)
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Pref) || "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref(stored);
    // 初期インラインscriptのmatchMediaがリロード直後に誤判定する端末(Android Chrome等)を是正。
    // ハイドレーション後はmatchMediaが安定するので、systemなら再解決して適用し直す。
    if (stored === "system") {
      document.documentElement.dataset.theme = resolve("system");
    }
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
      aria-label={d.theme.label}
    >
      <option value="system">{d.theme.system}</option>
      <option value="light">{d.theme.light}</option>
      <option value="dark">{d.theme.dark}</option>
    </select>
  );
}
