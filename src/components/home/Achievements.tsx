import { Icon } from "@/components/Icon";
import type { Achievement } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Achievements({ items }: { items: Achievement[] }) {
  const winner = items.findIndex((a) => a.rank === "winner");
  const active = winner >= 0 ? winner : Math.floor(items.length / 2);

  return (
    <section className="section" id="achievements" aria-labelledby="ach-h">
      <SectionHead id="ach-h" title="Achievements" lead="Competitions, certifications, and academic awards. Drag or use the arrows to browse." />
      <div className="fan-wrap">
        <ol className="fan" data-fan data-active={active} aria-label="Achievements, use the buttons below to browse">
          {items.map((a) => (
            <li key={a.id} className="fan-item" data-title={a.caption} data-what={a.story}>
              <div className="stub" aria-hidden="true" />
              <div className="event">
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                {a.sealText ? <span className="foil" aria-hidden="true">{a.sealText}</span> : null}
                <h3>{a.title}</h3>
                <p className="what">{a.description}</p>
                <div className={`ribbon is-${a.rank}`}>
                  {a.rank === "winner" ? (
                    <>
                      <span className="tail l" aria-hidden="true" />
                      <span className="tail r" aria-hidden="true" />
                    </>
                  ) : null}
                  {a.rank === "finalist" ? <span className="tail" aria-hidden="true" /> : null}
                  <span className="band">{a.rankLabel}</span>
                </div>
                <p className="year">{a.year}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="fan-controls">
          <button className="round-btn" type="button" data-fan-prev aria-label="Previous achievement"><Icon name="left" /></button>
          <button className="round-btn" type="button" data-fan-next aria-label="Next achievement"><Icon name="right" /></button>
          <p className="fan-caption" data-fan-caption aria-live="polite" />
        </div>
      </div>
    </section>
  );
}
