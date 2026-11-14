import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import type { HomeProject } from "@/content/home";

export function ProjectCard({ project: pr }: { project: HomeProject }) {
  const { print, leader, pin } = pr.cardArt;
  const pinClass = ["pin", pin.big && "is-big", pin.ink && "is-ink", pin.side === "r" && "points-r"].filter(Boolean).join(" ");
  const printStyle = {
    left: `${print.left}%`, top: `${print.top}%`, width: `${print.width}%`, height: `${print.height}%`, "--rot": `${print.rot}deg`,
  } as CSSProperties;

  return (
    <article
      className={`project${pr.layout === "half" ? " is-half" : ""}`}
      id={`p-${pr.slug}`}
      style={{ "--field": pr.fieldColor } as CSSProperties}
    >
      <div className="project-field">
        {pr.screenshot ? (
          <figure className="print" style={printStyle}>
            <img
              src={pr.screenshot.url}
              alt={pr.screenshot.alt}
              width={pr.screenshot.width}
              height={pr.screenshot.height}
              loading="lazy"
              style={print.objectPosition ? { objectPosition: print.objectPosition } : undefined}
            />
          </figure>
        ) : null}
        <svg className="leader" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={leader.d} pathLength={1} style={leader.ink ? { stroke: "var(--ink)" } : undefined} />
        </svg>
        <span className="lead-dot" style={{ left: `${leader.dot.x}%`, top: `${leader.dot.y}%` }} aria-hidden="true" />
        <p className={pinClass} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
          <b>{pr.metricValue}</b>
          <span>{pr.metricLabel}{pr.metricIsSample ? " (sample)" : ""}</span>
        </p>
      </div>
      <div className="project-body">
        <div>
          <h3><Inline text={pr.headline} /></h3>
          <div className="project-meta">
            <span>{pr.period}, {pr.roleLine}</span>
            <span className="tags">{pr.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
          </div>
        </div>
        <div className="project-links">
          {pr.caseStudyMd ? <a className="btn btn-ink" href={`/projects/${pr.slug}`}>Case study <Icon name="arrow-ur" /></a> : null}
          {pr.liveUrl ? <a className="link-plain" href={pr.liveUrl}>Live site</a> : null}
          {pr.codeUrl ? <a className="link-plain" href={pr.codeUrl}>Code</a> : null}
        </div>
      </div>
    </article>
  );
}
