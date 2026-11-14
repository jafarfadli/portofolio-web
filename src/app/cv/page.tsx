import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CvDocument } from "@/components/cv/CvDocument";
import { PrintButton } from "@/components/cv/PrintButton";
import { Icon } from "@/components/Icon";
import { getCvContent } from "@/content/cv";
import { getDb } from "@/db/client";
import { fullName } from "@/lib/name";
import "./cv.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const cv = getCvContent(getDb());
  return { title: cv ? `${fullName(cv.profile)}, CV` : "CV" };
}

export default function CvPage() {
  const cv = getCvContent(getDb());
  if (!cv) notFound();
  return (
    <div className="cv-page">
      <div className="cv-bar">
        <Link className="cv-back" href="/"><Icon name="left" />Back to the site</Link>
        <span className="note">Generated from the same records as the site.</span>
        <PrintButton />
      </div>
      <main className="cv-stage">
        <CvDocument cv={cv} />
      </main>
    </div>
  );
}
