import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import { Nav } from "@/components/home/Nav";
import { Scene } from "@/components/home/Scene";
import type { ArticleRoom, ArticleShot, ArticleView } from "@/content/article";
import { withBase } from "@/lib/base-path";
import { ArchDiagram } from "./ArchDiagram";
import { RoomShow } from "./RoomShow";
import "./article.css";

/** Copies of the name in the marquee: two full widths at the largest size, so the loop never shows a gap. */
const MARQUEE_COPIES = 8;

/**
 * A project article (docs/superpowers/specs/2026-11-18-project-articles-design.md): full-width bands in turn navy
 * and concrete, no cards. It opens on a question, the name rolls past, and the room follows; the four parts come after.
 */
export function ArticlePage({ view, ownerName }: { view: ArticleView; ownerName: string }) {
  const { room, article: a, shots, next } = view;
  return (
    <>
      <a className="skip" href="#art-main">Skip to the article</a>
      <Nav name={ownerName} onHome={false} />
      <main className="art" id="art-main">
        <section className="art-band theme-dark art-top" aria-labelledby="art-h">
          <a className="art-back" href={withBase("/#work")}><Icon name="left" />All work</a>
          <p className="art-q"><Inline text={a.hook} /></p>
          <h1 className="art-roll" id="art-h">
            <span className="sr-only">{room.name}</span>
            <span className="art-roll-track" aria-hidden="true">
              {Array.from({ length: MARQUEE_COPIES }, (_, i) => <span key={i}>{room.name}<i>✦</i></span>)}
            </span>
          </h1>
        </section>
        <Room room={room} live />

        <section className="art-band theme-light" aria-labelledby="art-problem">
          <div className="art-sec">
            <div className="art-side">
              <h2 className="art-label" id="art-problem">Problem <b>(01)</b></h2>
              <dl className="art-facts">
                <div><dt>Year</dt><dd>{a.facts.year}</dd></div>
                <div><dt>Role</dt><dd>{a.facts.role}</dd></div>
                <div><dt>Team</dt><dd>{a.facts.team}</dd></div>
                {view.tags.length > 0 ? (
                  <div><dt>Stack</dt><dd className="art-stack">{view.tags.map((t) => <span key={t} className="tag">{t}</span>)}</dd></div>
                ) : null}
              </dl>
            </div>
            <div>
              <p className="art-say"><Inline text={a.problem.say} /></p>
              <ul className="art-points">{a.problem.points.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>
            </div>
          </div>
        </section>

        {shots[0] ? <Screen shot={shots[0]} theme="theme-dark" /> : null}

        <section className="art-band theme-light" aria-labelledby="art-approach">
          <div className="art-sec">
            <h2 className="art-label" id="art-approach">Approach <b>(02)</b></h2>
            <div>
              <p className="art-say"><Inline text={a.approach.say} /></p>
              <ol className="art-calls">
                {a.approach.calls.map((c, i) => (
                  <li key={i}><b>{c.title}</b><Inline text={c.body} /><span>Gave up: {c.gaveUp}</span></li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="art-band theme-dark" aria-labelledby="art-arch">
          <div className="art-sec">
            <h2 className="art-label" id="art-arch">Architecture <b>(03)</b></h2>
            <p className="art-say"><Inline text={a.architecture.say} /></p>
          </div>
          <ArchDiagram arch={a.architecture} />
        </section>

        {shots[1] ? <Screen shot={shots[1]} theme="theme-light" /> : null}

        <section className="art-band theme-dark" aria-labelledby="art-results">
          <div className="art-sec">
            <h2 className="art-label" id="art-results">Results <b>(04)</b></h2>
            <p className="art-say"><Inline text={a.results.say} /></p>
          </div>
          <ul className="art-stats">
            {a.results.stats.map((s, i) => (
              <li key={i}><b>{s.value}</b><span>{s.label}{s.sample ? " (sample)" : ""}</span></li>
            ))}
          </ul>
        </section>

        {next ? (
          <a className="art-band theme-light art-next" href={withBase(`/projects/${next.slug}`)}>
            <span className="art-label">Next project</span>
            <span className="art-next-name">{next.name} <Icon name="arrow-ur" /></span>
            <Room room={next} />
          </a>
        ) : null}
      </main>
      <RoomShow />
    </>
  );
}

/** The project's room. Only the article's own room turns its screens (data-room); the next project's stays still. */
function Room({ room, live = false }: { room: ArticleRoom; live?: boolean }) {
  const cls = live ? "art-room" : "art-room is-next";
  // the next project's room sits inside its link, so it is hidden from the link's name ("Next project <Name>")
  const hidden = live ? undefined : true;
  if (room.scene && room.shots.length > 0) {
    return (
      <div className={cls} data-room={live || undefined} aria-hidden={hidden} style={{ "--field": room.fieldColor, "--scene-ar": `${room.scene.width} / ${room.scene.height}` } as CSSProperties}>
        <Scene scene={room.scene} slug={room.slug} layout="wide" shots={room.shots} phoneShot={room.phoneShot} />
      </div>
    );
  }
  const shot = room.shots[0]?.shot;
  if (!shot) return null;
  return (
    <div className={`${cls} is-print`} aria-hidden={hidden} style={{ "--field": room.fieldColor } as CSSProperties}>
      <img src={shot.url} srcSet={shot.srcSet} sizes="(max-width: 860px) 92vw, 1100px" alt={shot.alt} width={shot.width} height={shot.height} />
    </div>
  );
}

function Screen({ shot, theme }: { shot: ArticleShot; theme: "theme-dark" | "theme-light" }) {
  return (
    <figure className={`art-band ${theme} art-shot`}>
      <img src={shot.url} srcSet={shot.srcSet} sizes="(max-width: 860px) 100vw, 1200px" alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" />
      {shot.caption ? <figcaption>{shot.caption}</figcaption> : null}
    </figure>
  );
}
