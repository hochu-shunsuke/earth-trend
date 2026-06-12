"use client";

import { useRouter } from "next/navigation";
import { GEO_LABELS } from "@/lib/trends";

export default function GeoSelect({ geo }: { geo: string }) {
  const router = useRouter();
  return (
    <select
      className="btn"
      value={geo}
      onChange={(e) => router.push(`/list?geo=${e.target.value}`)}
      aria-label="国を選択"
    >
      {Object.entries(GEO_LABELS).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
