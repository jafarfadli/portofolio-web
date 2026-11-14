import type { CSSProperties } from "react";
import { Inline } from "@/components/Inline";
import type { HomeContent } from "@/content/home";

export function About({ content }: { content: HomeContent }) {
  return (
    <section className="section" id="about" aria-labelledby="about-h">
      <h2 id="about-h" className="sr-only">About</h2>
      <p className="about-text"><Inline text={content.profile.aboutText} /></p>
      <ul className="stack-sheet" data-chips aria-label="Stack">
        {content.skills.map((s) => (
          <li key={s.id} className="chip" style={{ "--rot": `${s.rot}deg` } as CSSProperties}>{s.name}</li>
        ))}
      </ul>
    </section>
  );
}
