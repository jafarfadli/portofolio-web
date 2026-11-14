import type { HomeProject } from "@/content/home";
import { ProjectCard } from "./ProjectCard";
import { SectionHead } from "./SectionHead";

export function Work({ projects }: { projects: HomeProject[] }) {
  return (
    <section className="section" id="work" aria-labelledby="work-h">
      <SectionHead id="work-h" title="Selected work" />
      <div className="work-grid">
        {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
    </section>
  );
}
