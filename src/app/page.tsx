import type { Metadata } from "next";
import QRCode from "qrcode";
import { HomePage } from "@/components/home/HomePage";
import { getHomeContent, getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const p = getProfile(getDb());
  return { title: `${p.firstName} ${p.lastName}, ${p.role}`, description: p.cvSummary };
}

export default async function Page() {
  const content = getHomeContent(getDb());
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
    name: `${p.firstName} ${p.lastName}`,
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
