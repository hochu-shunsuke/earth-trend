"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

interface TrendItem {
  word: string;
  traffic: string;
  news: NewsItem[];
}

interface LabelDatum {
  word: string;
  geo: string;
  lat: number;
  lng: number;
  size: number;
  news: NewsItem[];
  isNew: boolean;
}

// 各国の重心座標
const GEO_CENTER: Record<string, { lat: number; lng: number; label: string }> = {
  JP: { lat: 36.2, lng: 138.2, label: "日本" },
  US: { lat: 39.8, lng: -98.6, label: "アメリカ" },
  GB: { lat: 54.0, lng: -2.0, label: "イギリス" },
  IN: { lat: 22.0, lng: 79.0, label: "インド" },
  KR: { lat: 36.5, lng: 127.8, label: "韓国" },
  TW: { lat: 23.7, lng: 121.0, label: "台湾" },
  DE: { lat: 51.2, lng: 10.4, label: "ドイツ" },
  FR: { lat: 46.6, lng: 2.5, label: "フランス" },
  BR: { lat: -10.8, lng: -52.9, label: "ブラジル" },
};

function parseTraffic(traffic: string): number {
  return parseInt(traffic.replace(/[^0-9]/g, ""), 10) || 0;
}

/** 国の重心の周りに黄金角で散らす */
function scatter(center: { lat: number; lng: number }, i: number) {
  const angle = i * 2.39996; // 黄金角(rad)
  const dist = 1.2 + 1.6 * Math.sqrt(i);
  const lat = center.lat + dist * Math.cos(angle);
  const lng =
    center.lng + (dist * Math.sin(angle)) / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
  return { lat, lng };
}

export default function GlobePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const prevWordsRef = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<LabelDatum | null>(null);
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    let disposed = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const buildLabels = (data: Record<string, TrendItem[]>): LabelDatum[] => {
      const labels: LabelDatum[] = [];
      const seen = new Set<string>();
      for (const [geo, items] of Object.entries(data)) {
        const center = GEO_CENTER[geo];
        if (!center) continue;
        items.forEach((it, i) => {
          const key = `${geo}:${it.word}`;
          if (seen.has(key)) return;
          seen.add(key);
          const { lat, lng } = scatter(center, i);
          labels.push({
            word: it.word,
            geo,
            lat,
            lng,
            size: Math.max(0.6, Math.log10(parseTraffic(it.traffic) + 1) * 0.45),
            news: it.news,
            isNew:
              prevWordsRef.current.size > 0 && !prevWordsRef.current.has(key),
          });
        });
      }
      return labels;
    };

    const load = async () => {
      const res = await fetch("/api/trends-all");
      if (!res.ok) {
        setStatus("データ取得に失敗しました");
        return;
      }
      const { data }: { data: Record<string, TrendItem[]> } = await res.json();
      if (disposed || !globeRef.current) return;

      const labels = buildLabels(data);
      globeRef.current.htmlElementsData(labels);
      // 新着ワードにパルスリングを立てる(ライブ感)
      globeRef.current.ringsData(labels.filter((l) => l.isNew));
      prevWordsRef.current = new Set(
        labels.map((l) => `${l.geo}:${l.word}`),
      );
      setStatus(`${labels.length} trends / ${Object.keys(data).length}カ国`);
    };

    (async () => {
      const { default: Globe } = await import("globe.gl");
      if (disposed || !containerRef.current) return;

      const globe = new Globe(containerRef.current)
        .width(window.innerWidth)
        .height(window.innerHeight)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .backgroundColor("#0a0a1a")
        .atmosphereColor("#4fc3f7")
        .atmosphereAltitude(0.18)
        // 3Dテキストはラテン文字しか描けないため、HTML要素レイヤーで多言語ラベルを描く
        .htmlAltitude(0.012)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .htmlElement((d: any) => {
          const label = d as LabelDatum;
          const el = document.createElement("div");
          el.textContent = label.word;
          el.style.cssText = [
            `font-size: ${Math.round(8 + label.size * 7)}px`,
            `color: ${label.isNew ? "#7CFC9B" : "#ffd58a"}`,
            "font-family: sans-serif",
            "white-space: nowrap",
            "cursor: pointer",
            "pointer-events: auto",
            "text-shadow: 0 0 4px rgba(0,0,0,0.9)",
            "transform: translate(-50%, -50%)",
          ].join(";");
          el.onclick = () => setSelected(label);
          return el;
        })
        .ringColor(() => (t: number) => `rgba(124,252,155,${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(1.2)
        .ringRepeatPeriod(1200);

      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
      globe.pointOfView({ lat: 25, lng: 110, altitude: 2.2 });

      globeRef.current = globe;
      await load();
      interval = setInterval(load, 10 * 60 * 1000); // 10分ごとに更新(新着はパルス)
    })();

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
      globeRef.current?._destructor?.();
      globeRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0a1a" }}>
      <div ref={containerRef} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          padding: 8,
          display: "flex",
          gap: 12,
          color: "#fff",
          background: "rgba(0,0,0,0.5)",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ color: "#9ecbff" }}>グラフ</Link>
        <a href="/list" style={{ color: "#9ecbff" }}>リスト</a>
        <span style={{ fontSize: "0.85em", color: "#aaa" }}>{status}</span>
      </div>

      {selected && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 320,
            maxHeight: "80vh",
            overflowY: "auto",
            padding: 8,
            color: "#fff",
            background: "#16161f",
          }}
        >
          <strong>{selected.word}</strong>
          <span style={{ marginLeft: 6, color: "#aaa" }}>
            ({GEO_CENTER[selected.geo]?.label ?? selected.geo})
          </span>
          {selected.news.length > 0 && (
            <ul style={{ paddingLeft: 16 }}>
              {selected.news.slice(0, 3).map((n, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {n.url ? (
                    <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
                      {n.title}
                    </a>
                  ) : (
                    n.title
                  )}
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: "6px 0" }}>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(selected.word)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4fc3f7" }}
            >
              Googleで検索 →
            </a>
            {(selected.geo === "JP" || selected.geo === "US") && (
              <>
                {" / "}
                <Link href="/" style={{ color: "#4fc3f7" }}>
                  グラフで掘る →
                </Link>
              </>
            )}
          </p>
          <button onClick={() => setSelected(null)}>close</button>
        </div>
      )}
    </div>
  );
}
