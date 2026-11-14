import type { CSSProperties } from "react";
import type { HomeAchievement } from "@/content/home";
import { SectionHead } from "./SectionHead";

/** Each pass hangs at its own small angle from the strap. */
const ROT = ["-2deg", "1.6deg", "-1.2deg", "2.2deg", "-1.6deg"];

/**
 * Passes ride past on a strap. The track holds the list twice (CSS moves it by half its width), so the loop is
 * seamless before hydration too; the second copy is hidden from assistive tech and its photos carry no alt.
 * A pass stacks its photos in one frame; home-motion.ts cross-fades them, and the dots say which one shows.
 * Only the first photo of an original pass carries alt text; the later ones are extra views of the same event.
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
          {a.photos.length > 0 ? (
            <div className="ach-photos" data-photos>
              {a.photos.map((photo, n) => (
                // The index keeps keys unique when the owner picks the same photo twice.
                <img key={`${n}:${photo.url}`} className={n === 0 ? "ach-photo is-on" : "ach-photo"} src={photo.url} srcSet={photo.srcSet} sizes="(max-width: 860px) 260px, 340px" alt={clone || n > 0 ? "" : photo.alt} width={photo.width} height={photo.height} loading="lazy" />
              ))}
              {a.photos.length > 1 ? (
                <span className="ach-dots" aria-hidden="true">
                  {a.photos.map((_, n) => <i key={n} className={n === 0 ? "is-on" : undefined} />)}
                </span>
              ) : null}
            </div>
          ) : null}
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
      {/* Hover slows the strap; focusing the strip itself (by Tab) stops it, and so does leaving the screen. There is no
          pause button: the strip is the stop (see home-motion.ts and site.css). */}
      <div className="reel" data-reel tabIndex={0} role="region" aria-label="Achievements, moving strip. Focus it to stop.">
        <ul className="reel-track" data-reel-track aria-label="Achievements">
          {passes(false)}
          {passes(true)}
        </ul>
      </div>
    </section>
  );
}
