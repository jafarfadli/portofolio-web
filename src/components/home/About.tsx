import type { CSSProperties } from "react";
import { Inline } from "@/components/Inline";
import type { HomeContent } from "@/content/home";

/** The chips are set in a run of print styles, so no two side by side look alike (owner, 2026-11-18, after
 *  whyramachandran.design): inked, outlined, dot-matrix, navy, light expanded, condensed caps, and the white sticker. */
const LOOKS = ["is-ink", "is-line", "is-dot", "is-navy", "is-thin", "is-caps", "is-sticker", "is-line"] as const;

/** A short name (Go, C#, MCP) is printed on a round chip. */
const isRound = (name: string) => name.length <= 3;

export function About({ content }: { content: HomeContent }) {
  const skills = content.skills;
  return (
    <section className="section theme-light" id="about" aria-labelledby="about-h">
      <h2 id="about-h" className="sr-only">About</h2>
      <p className="about-text"><Inline text={content.profile.aboutText} icons /></p>
      <ul className="stack-sheet" data-chips aria-label="Stack">
        {skills.map((s, i) => {
          // the first chip and the last lean right over, like stickers slapped on the ends of the run
          const lean = i === 0 ? -14 : i === skills.length - 1 && skills.length > 2 ? 14 : 0;
          const cls = ["chip", LOOKS[i % LOOKS.length], isRound(s.name) && "is-round", lean && "is-leaning"].filter(Boolean).join(" ");
          return (
            <li key={s.id} className={cls} style={{ "--rot": `${s.rot + lean}deg` } as CSSProperties}>{s.name}</li>
          );
        })}
      </ul>
    </section>
  );
}
