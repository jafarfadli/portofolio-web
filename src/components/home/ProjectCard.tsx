import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import type { HomeProject } from "@/content/home";
import { DEVICE_SCENES } from "@/content/device-scenes";
import { withBase } from "@/lib/base-path";
import { Scene, Shots } from "./Scene";

export function ProjectCard({ project: pr, layout }: { project: HomeProject; layout: "wide" | "half" }) {
  // Steps with a screenshot make the show. A step's feature rides on the print as a tag; a feature without its
  // screenshot is not shown.
  const shots = pr.steps.flatMap((st, i) => (st.shot ? [{ shot: st.shot, i }] : []));
  const hasTags = shots.some(({ i }) => pr.steps[i].feature);
  const tag = hasTags ? (
    // One tag; it reads the feature of the screenshot on top. With more than one screenshot it is a button that
    // turns to the next one.
    <FeatureTag shots={shots.map(({ i }) => ({ i, text: pr.steps[i].feature }))} many={shots.length > 1} name={pr.name} />
  ) : null;
  // A project with a rendered room shows its screenshots on the devices in it; any other keeps the print.
  const scene = shots.length > 0 ? DEVICE_SCENES[pr.slug] : undefined;
  const { print, pin: artPin, leader: artLeader } = pr.cardArt;
  const pin = scene ? { ...artPin, ...scene.pin } : artPin;
  const leader = scene ? { ...artLeader, d: scene.leader, dot: scene.dot } : artLeader;
  const pinClass = ["pin", pin.big && "is-big", pin.ink && "is-ink", pin.side === "r" && "points-r"].filter(Boolean).join(" ");
  const printStyle = {
    left: `${print.left}%`, top: `${print.top}%`, width: `${print.width}%`, height: `${print.height}%`, "--rot": `${print.rot}deg`,
  } as CSSProperties;

  return (
    <article
      // is-offscreen holds the show until home-motion.ts sees the card; without scripts it never runs.
      className={`project${layout === "half" ? " is-half" : ""}${scene ? " has-scene" : ""}${shots.length > 1 ? " is-offscreen" : ""}`}
      id={`p-${pr.slug}`}
      style={{ "--field": pr.fieldColor } as CSSProperties}
    >
      <div className={scene ? "project-field has-scene" : "project-field"} style={scene ? ({ "--scene-ar": `${scene.width} / ${scene.height}` } as CSSProperties) : undefined}>
        {scene ? (
          <>
            <Scene scene={scene} slug={pr.slug} layout={layout} shots={shots} phoneShot={pr.phoneShot} />
            {tag ? <div className="scene-tag">{tag}</div> : null}
          </>
        ) : shots.length > 0 ? (
          <figure className={shots.length > 1 ? "print has-stack" : "print"} style={printStyle} data-show>
            <span className="print-win">
              <Shots shots={shots} sizes="(max-width: 860px) 90vw, 760px" objectPosition={print.objectPosition} />
            </span>
            {tag}
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
          {pr.hasArticle ? <a className="btn btn-ink" href={withBase(`/projects/${pr.slug}`)}>Read the story <Icon name="arrow-ur" /></a> : null}
          {pr.liveUrl ? <a className="link-plain" href={pr.liveUrl}>Live site</a> : null}
          {pr.codeUrl ? <a className="link-plain" href={pr.codeUrl}>Code</a> : null}
        </div>
      </div>
    </article>
  );
}

function FeatureTag({ shots, many, name }: { shots: { i: number; text: string }[]; many: boolean; name: string }) {
  const lines = shots.map(({ i, text }, n) => (
    <span key={i} className={n === 0 ? "feat-line is-on" : "feat-line"} data-step={i} aria-hidden={n === 0 ? undefined : "true"}>
      {text}
    </span>
  ));
  if (!many) return <span className="feat-tag" data-feat-tag>{lines}</span>;
  return (
    <button type="button" className="feat-tag" data-feat-tag aria-label={`${name}: next screenshot`}>
      {lines}
    </button>
  );
}
