import { Inline } from "@/components/Inline";
import type { Education, Experience as ExperienceRow } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Experience({ experiences, education }: { experiences: ExperienceRow[]; education: Education[] }) {
  return (
    <section className="section" id="experience" aria-labelledby="exp-h">
      <SectionHead id="exp-h" title="Experience and education" />
      <div className="itinerary on-stock">
        <h3>Experience</h3>
        <ol>
          {experiences.map((e) => (
            <li key={e.id} className="stop">
              <span className="when">{e.period}</span>
              <div className="who">{e.role}<span>{[e.org, e.location].filter(Boolean).join(", ")}</span></div>
              <p><Inline text={e.summary} /></p>
            </li>
          ))}
        </ol>
        <h3>Education</h3>
        <ol>
          {education.map((e) => (
            <li key={e.id} className="stop">
              <span className="when">{e.period}</span>
              <div className="who">{e.degree}<span>{e.institution}</span></div>
              <p><Inline text={e.note} /></p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
