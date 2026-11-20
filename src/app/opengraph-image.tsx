import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";
import { fullName } from "@/lib/name";
import { OG_SIZE, OG_TYPE, ogCard } from "@/lib/og-card";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Portfolio card: name, role and what I build";

export default function Image() {
  const p = getProfile(getDb());
  return ogCard({
    label: "Portfolio",
    title: p ? fullName(p) : "Portfolio",
    text: p ? p.role : "",
    footLeft: p?.stackLine ?? "",
    footRight: "Projects, story and CV",
  });
}
