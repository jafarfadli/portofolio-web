import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import type { HomeAchievement } from "@/content/home";
import { SectionHead } from "./SectionHead";

/** Each pass hangs at its own small angle from the strap. */
const ROT = ["-2deg", "1.6deg", "-1.2deg", "2.2deg", "-1.6deg"];

/**
 * Passes ride past on a strap. The track holds the list twice (CSS moves it by half its width), so the loop is
 * seamless before hydration too; the second copy is hidden from assistive tech and its photos carry no alt.
 */
export function Achievements({ items }: { items: HomeAchievement[] }) {
  const passes = (clone: boolean) =>
    items.map((a, i) => (
      <li
        key={`${clone ? "c" : "a"}${a.id}`}
        className={clone ? "ach is-clone" : "ach"}
        aria-hidden={clone ? "true" : undefined}
        style={{ "--rot": ROT[i % ROT.length] } as CSSProperties}
      >
        <article className="ach-card">
          <span className="slot" aria-hidden="true" />
          {a.photos.map((photo, n) => (
            <img key={photo.url} className="ach-photo" src={photo.url} srcSet={photo.srcSet} sizes="(max-width: 860px) 260px, 340px" alt={clone || n > 0 ? "" : photo.alt} width={photo.width} height={photo.height} loading="lazy" />
          ))}
          <div className="ach-body">
            <p className="ach-meta"><span className={`rank is-${a.rank}`}>{a.rankLabel}</span><span className="ach-year">{a.year}</span></p>
            <h3>{a.title}</h3>
            <p>{a.story}</p>
          </div>
        </article>
      </li>
    ));

  return (
    <section className="section theme-light" id="achievements" aria-labelledby="ach-h">
      <SectionHead id="ach-h" title="Achievements" lead="Competitions, certifications, and academic awards." />
      <div className="reel" data-reel>
        <ul className="reel-track" data-reel-track aria-label="Achievements">
          {passes(false)}
          {passes(true)}
        </ul>
      </div>
      <div className="reel-controls">
        <button className="round-btn" type="button" data-reel-toggle aria-label="Pause the achievements">
          <Icon name="pause" />
        </button>
      </div>
    </section>
  );
}
