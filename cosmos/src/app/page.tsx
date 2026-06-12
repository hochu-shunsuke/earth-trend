"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

// SSR不可のため動的インポート
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

// --- 型定義 ---

interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

interface TrendItem {
  word: string;
  traffic: string;
  picture?: string;
  news: NewsItem[];
}

interface GraphNode {
  id: string;
  label: string;
  isTrend: boolean;
  traffic: number;
  news: NewsItem[];
  expanded: boolean;
  // force-graph によって実行時に付与される座標
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

type Geo = "JP" | "US";

// --- ヘルパー ---

function parseTraffic(traffic: string): number {
  const n = parseInt(traffic.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function nodeVal(node: GraphNode): number {
  if (!node.isTrend || node.traffic === 0) return 4;
  return Math.max(4, Math.log10(node.traffic + 1) * 10);
}

function nodeColor(node: GraphNode): string {
  return node.isTrend ? "#ff6b35" : "#4fc3f7";
}

function drawNodeCanvas(
  node: GraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number
) {
  const label = node.label;
  const fontSize = Math.max(8, 12 / globalScale);
  const r = nodeVal(node);

  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = nodeColor(node);
  ctx.fill();

  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(label).width;
  const bx = (node.x ?? 0) - textWidth / 2 - 2;
  const by = (node.y ?? 0) + r + 2;
  const bw = textWidth + 4;
  const bh = fontSize + 2;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(bx, by, bw, bh);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, node.x ?? 0, by + bh / 2);
}

// --- メインコンポーネント ---

export default function Home() {
  const [geo, setGeo] = useState<Geo>("JP");
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());

  // geo変更時のトレンド取得
  const handleGeoChange = useCallback(async (g: Geo) => {
    setLoading(true);
    setError(null);
    setGraphData({ nodes: [], links: [] });
    setSelectedNews([]);
    setSelectedWord(null);
    nodeMapRef.current = new Map();

    try {
      const res = await fetch(`/api/trends?geo=${g}`);
      if (!res.ok) throw new Error(`trends fetch failed: ${res.status}`);
      const data: { geo: string; items: TrendItem[] } = await res.json();

      const nodes: GraphNode[] = data.items.map((item) => ({
        id: item.word,
        label: item.word,
        isTrend: true,
        traffic: parseTraffic(item.traffic),
        news: item.news,
        expanded: false,
      }));

      const map = new Map<string, GraphNode>();
      nodes.forEach((n) => map.set(n.id, n));
      nodeMapRef.current = map;

      setGraphData({ nodes: [...nodes], links: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回マウント時に geo=JP でフェッチ
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      handleGeoChange("JP");
    }
  }, [handleGeoChange]);

  // ノードクリック
  const handleNodeClick = useCallback(
    async (rawNode: object) => {
      const node = rawNode as GraphNode;

      if (node.isTrend && node.news.length > 0) {
        setSelectedWord(node.label);
        setSelectedNews(node.news);
      } else {
        setSelectedWord(null);
        setSelectedNews([]);
      }

      if (node.expanded) return;

      const existing = nodeMapRef.current.get(node.id);
      if (existing) {
        existing.expanded = true;
      }

      const hl = geo === "US" ? "en" : "ja";
      try {
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(node.id)}&hl=${hl}`
        );
        if (!res.ok) return;
        const data: { q: string; suggestions: string[] } = await res.json();

        setGraphData((prev) => {
          const newNodes = [...prev.nodes];
          const newLinks = [...prev.links];

          data.suggestions.forEach((suggestion) => {
            if (!nodeMapRef.current.has(suggestion)) {
              const newNode: GraphNode = {
                id: suggestion,
                label: suggestion,
                isTrend: false,
                traffic: 0,
                news: [],
                expanded: false,
              };
              nodeMapRef.current.set(suggestion, newNode);
              newNodes.push(newNode);
            }
            const linkExists = newLinks.some(
              (l) =>
                (l.source === node.id && l.target === suggestion) ||
                (l.source === suggestion && l.target === node.id)
            );
            if (!linkExists) {
              newLinks.push({ source: node.id, target: suggestion });
            }
          });

          return { nodes: newNodes, links: newLinks };
        });
      } catch {
        // サジェスト失敗は無視
      }
    },
    [geo]
  );

  const winW = typeof window !== "undefined" ? window.innerWidth : 800;
  const winH = typeof window !== "undefined" ? window.innerHeight : 600;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* コントロールバー */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 10,
          padding: "8px",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <span>Geo:</span>
        <button
          onClick={() => {
            setGeo("JP");
            handleGeoChange("JP");
          }}
          style={{
            fontWeight: geo === "JP" ? "bold" : "normal",
            textDecoration: geo === "JP" ? "underline" : "none",
          }}
        >
          JP
        </button>
        <button
          onClick={() => {
            setGeo("US");
            handleGeoChange("US");
          }}
          style={{
            fontWeight: geo === "US" ? "bold" : "normal",
            textDecoration: geo === "US" ? "underline" : "none",
          }}
        >
          US
        </button>
        {loading && <span>Loading...</span>}
        {error && <span style={{ color: "red" }}>Error: {error}</span>}
      </div>

      {/* ニュースパネル */}
      {selectedWord && selectedNews.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            zIndex: 10,
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "8px",
            maxWidth: "300px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <strong>{selectedWord}</strong>
          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
            {selectedNews.map((n, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                {n.url ? (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#4fc3f7" }}
                  >
                    {n.title}
                  </a>
                ) : (
                  <span>{n.title}</span>
                )}
                {n.source && (
                  <span style={{ fontSize: "0.8em", color: "#aaa" }}>
                    {" "}
                    ({n.source})
                  </span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setSelectedWord(null);
              setSelectedNews([]);
            }}
          >
            close
          </button>
        </div>
      )}

      {/* グラフ */}
      <ForceGraph2D
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphData={graphData as any}
        width={winW}
        height={winH}
        backgroundColor="#0a0a1a"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeVal={(n: any) => nodeVal(n as GraphNode)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeColor={(n: any) => nodeColor(n as GraphNode)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D, scale: number) =>
          drawNodeCanvas(n as GraphNode, ctx, scale)
        }
        nodeCanvasObjectMode={() => "replace"}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNodeClick={(n: any) => handleNodeClick(n as object)}
        linkColor={() => "#555555"}
      />
    </div>
  );
}
