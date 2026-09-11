import type { Metadata } from "next";

// globe/page は client component なのでメタはここ(server layout)で出す
export const metadata: Metadata = {
  title: "Globe",
  description: "See the world's attention on a globe. Each country's risings light up as live pulses.",
  alternates: { canonical: "/globe" },
};

export default function GlobeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
