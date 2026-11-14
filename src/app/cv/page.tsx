import type { Metadata } from "next";
import { CvDocument } from "@/components/cv/CvDocument";
import { PrintButton } from "@/components/cv/PrintButton";
import { Icon } from "@/components/Icon";
import { getCvContent } from "@/content/cv";
import { getDb } from "@/db/client";
import "./cv.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const cv = getCvContent(getDb())!;
  return { title: `${cv.profile.firstName} ${cv.profile.lastName}, CV` };
}

export default function CvPage() {
  const cv = getCvContent(getDb())!;
  return (
    <div className="cv-page">
      <div className="cv-bar">
        <a className="back" href="/"><Icon name="left" />Back to the site</a>
        <span className="note">Generated from the same records as the site.</span>
        <PrintButton />
      </div>
      <main className="cv-stage">
        <CvDocument cv={cv} />
      </main>
    </div>
  );
}
