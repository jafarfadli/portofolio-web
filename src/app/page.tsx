import type { Metadata } from "next";
import QRCode from "qrcode";
import { FirstRun } from "@/components/home/FirstRun";
import { HomePage } from "@/components/home/HomePage";
import { fillProfile } from "@/content/derive";
import { getHomeContent, getProfile } from "@/content/home";
import { getDb } from "@/db/client";
import { fullName } from "@/lib/name";
import { siteBase } from "@/lib/site-base";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const p = getProfile(getDb());
  if (!p) return { title: "Portfolio" };
  const title = `${fullName(p)}, ${p.role}`;
  const description = fillProfile(p).cvSummary;
  return {
    title,
    description,
    ...siteBase(p.siteUrl),
    openGraph: { type: "website", url: "/", siteName: fullName(p), title, description },
  };
}

export default async function Page() {
  const content = getHomeContent(getDb());
  if (!content) return <FirstRun />;
  const svg = await QRCode.toString(`${content.profile.siteUrl}/cv`, {
    type: "svg",
    margin: 0,
    color: { dark: "#111216", light: "#f2f2ee" },
  });
  const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const p = content.profile;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName(p),
    jobTitle: p.role,
    email: `mailto:${p.email}`,
    url: p.siteUrl,
    sameAs: [p.githubUrl, p.linkedinUrl],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePage content={content} qrDataUrl={qrDataUrl} />
    </>
  );
}
