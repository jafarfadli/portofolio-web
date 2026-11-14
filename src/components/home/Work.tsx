import type { HomeProject } from "@/content/home";
import { ProjectCard } from "./ProjectCard";
import { SectionHead } from "./SectionHead";

/** DESIGN.md fixes the Selected work rhythm by position, whatever each row stores: wide, half, half, wide. */
const LAYOUTS = ["wide", "half", "half", "wide"] as const;

export function Work({ projects }: { projects: HomeProject[] }) {
  return (
    <section className="section theme-dark" id="work" aria-labelledby="work-h">
      <SectionHead id="work-h" title="Selected work" />
      <div className="work-grid">
        {projects.map((p, i) => <ProjectCard key={p.id} project={p} layout={LAYOUTS[i] ?? "wide"} />)}
      </div>
    </section>
  );
}
