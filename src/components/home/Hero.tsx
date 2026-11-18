import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import type { HomeContent } from "@/content/home";
import { iconCount } from "@/lib/inline";
import { statementLines, switchAt } from "@/lib/statement";
import { displayUrl } from "@/lib/url";
import { withBase } from "@/lib/base-path";

/** The hero's showcase (owner, 2026-11-18): three projects as stickers in a row under the headline, each with the
 *  screenshot of the step named here (0 is the main one; Clinky shows its 2D board, not the 3D room). Without these
 *  projects among the featured ones, the first three featured projects with a screenshot stand in. */
const SHOWCASE: { slug: string; step: number }[] = [
  { slug: "debt-report", step: 0 },
  { slug: "c-sat", step: 0 },
  { slug: "clinky", step: 1 },
];
const SLOTS = ["s-1", "s-2", "s-3"] as const;

/** The headline's line looks, in turn: tall condensed, expanded black, outline, expanded black. */
const LINE_LOOKS = ["is-tall", "", "is-outline", ""] as const;

/** The lead line (the one about AI) prints one "o" as a switch that turns on (owner, 2026-11-18, after
 *  whyramachandran.design's toggle in "PRODUCT"). The letter stays in the text for readers and the swarm. */
function Switched({ text, tiltFrom }: { text: string; tiltFrom: number }) {
  const k = switchAt(text);
  if (k < 0) return <Inline text={text} icons tiltFrom={tiltFrom} />;
  const before = text.slice(0, k);
  return (
    <>
      <Inline text={before} icons tiltFrom={tiltFrom} />
      <span className="switch-o">{text[k]}</span>
      <span className="hero-switch" data-switch aria-hidden="true"><i /></span>
      <Inline text={text.slice(k + 1)} icons tiltFrom={tiltFrom + iconCount(before)} />
    </>
  );
}

export function Hero({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p, photo, projects } = content;
  const named = SHOWCASE.flatMap(({ slug, step }) => {
    const pr = projects.find((x) => x.slug === slug);
    const shot = pr?.steps[step]?.shot ?? pr?.screenshot;
    return pr && shot ? [{ pr, shot }] : [];
  });
  const showcase = (named.length ? named : projects.flatMap((pr) => (pr.screenshot ? [{ pr, shot: pr.screenshot }] : []))).slice(0, SLOTS.length);
  const lines = statementLines(p.statementLine1, p.statementLine2);
  const lead = Math.max(0, lines.findIndex((l) => /\bAI\b/.test(l)));
  const tiltAt = (i: number) => lines.slice(0, i).reduce((n, l) => n + iconCount(l), 0);
  const name = `${p.firstName} ${p.lastName}`.toUpperCase();
  // The mockup's " &nbsp; " (space, no-break space, space), so the gap between repeats survives white-space collapsing.
  const strap = Array.from({ length: 3 }, () => name).join(" \u00a0 ");

  return (
    <section className="hero theme-dark" aria-label="Introduction">
      {/* punched dust: drawn by home-motion.ts, behind the type and the stickers */}
      <canvas className="hero-dust" data-dust aria-hidden="true" />
      <div className="hero-stage">
        <div className="pendulum" data-pendulum>
          <div className="strap l" aria-hidden="true"><span>{strap}</span></div>
          <div className="strap r" aria-hidden="true"><span>{strap}</span></div>
          {/* ring: a triangle ring wider than the webbing; its top bar runs inside the folded tab, so it goes in behind the strap and comes out on the other side */}
          <svg className="hw hw-ring" viewBox="0 0 64 44" aria-hidden="true">
            <path fill="none" stroke="#7f8391" strokeWidth="4.6" strokeLinejoin="round" d="M13 10.5H51Q57.5 10.5 54.6 16.2L34.6 38.6Q32 41.3 29.4 38.6L9.4 16.2Q6.5 10.5 13 10.5Z" />
            <path fill="none" stroke="#c9ccd6" strokeWidth="2.8" strokeLinejoin="round" d="M13 10.5H51Q57.5 10.5 54.6 16.2L34.6 38.6Q32 41.3 29.4 38.6L9.4 16.2Q6.5 10.5 13 10.5Z" />
            <path fill="none" stroke="#eef0f4" strokeWidth="0.9" strokeLinecap="round" d="M12.6 9.7H51M8.7 15.4L28.8 37.6" />
          </svg>
          {/* the tab: both lengths sewn flat into one end with a box-and-cross stitch, folded under round the ring bar */}
          <svg className="hw hw-tab" viewBox="0 0 64 46" aria-hidden="true">
            <defs>
              <pattern id="webbing-tab" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="#e5e4df" /><image href={withBase("/textures/webbing.png")} width="16" height="16" /></pattern>
              <linearGradient id="tab-fold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111216" stopOpacity="0" /><stop offset="1" stopColor="#111216" stopOpacity="0.26" /></linearGradient>
            </defs>
            <path fill="url(#webbing-tab)" d="M16 0H48V40.6Q48 44 44.6 44H19.4Q16 44 16 40.6Z" />
            <path fill="url(#tab-fold)" d="M16 33H48V40.6Q48 44 44.6 44H19.4Q16 44 16 40.6Z" />
            <rect x="16" y="0" width="2" height="41" fill="#fff" fillOpacity="0.35" />
            <rect x="45" y="0" width="3" height="41" fill="#111216" fillOpacity="0.2" />
            <g fill="none" stroke="#1d2640" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2.6 2"><rect x="20.5" y="6" width="23" height="21" rx="1" /><path d="M20.5 6L43.5 27M43.5 6L20.5 27" /></g>
          </svg>
          {/* swivel: its eye hooks the ring's point. The lobster clasp is hooked THROUGH the badge slot: the strip of card above
              the slot runs through the clasp's loop. The front strand comes down over the card into the hole, the wire crosses
              inside the hole, and the back strand runs behind the card until it comes out above the card's top edge.
              The shadow is drawn first and then clipped with the strand, so the back strand casts nothing on the card's face.
              In this 64x80 frame the card's top edge is y=56 and the slot's top is y=74 (badge top = strap + 78px, slot 18px lower). */}
          <svg className="hw hw-clasp" viewBox="0 0 64 80" aria-hidden="true">
            <defs>
              <filter id="hw-shadow" x="-40%" y="-20%" width="180%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="1.5" floodColor="#0a0b12" floodOpacity="0.45" /></filter>
              <clipPath id="clasp-behind-card"><path d="M-20 -10H84V56H32V74H84V96H-20Z" /></clipPath>
              <clipPath id="clasp-wire"><path clipRule="evenodd" d="M32 29C25.5 30.5 20 43 20 58C20 70 25 79 32 79C39 79 44 70 44 58C44 43 38.5 30.5 32 29ZM32 38C28 39.5 25.5 47 25.5 59C25.5 68.5 28.5 74.5 32 74.5C35.5 74.5 38.5 68.5 38.5 59C38.5 47 36 39.5 32 38Z" /></clipPath>
              <linearGradient id="clasp-in-slot" x1="0" y1="74" x2="0" y2="79" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#111216" stopOpacity="0.55" /><stop offset="1" stopColor="#111216" stopOpacity="0.15" /></linearGradient>
            </defs>
            <g clipPath="url(#clasp-behind-card)">
              <g filter="url(#hw-shadow)">
                <rect x="29.4" y="1.6" width="5.2" height="14" rx="2.6" fill="none" stroke="#a7abb7" strokeWidth="2.2" />
                <rect x="26" y="14" width="12" height="11" rx="3.2" fill="#c9ccd6" />
                <rect x="26" y="19.4" width="12" height="2.2" fill="#a7abb7" />
                <rect x="30" y="25" width="4" height="5" fill="#7f8391" />
                <rect x="19" y="50.5" width="3" height="5" fill="#a7abb7" />
                <rect x="15" y="47" width="5.5" height="12" rx="2" fill="#a7abb7" />
                <path fill="#c9ccd6" fillRule="evenodd" d="M32 29C25.5 30.5 20 43 20 58C20 70 25 79 32 79C39 79 44 70 44 58C44 43 38.5 30.5 32 29ZM32 38C28 39.5 25.5 47 25.5 59C25.5 68.5 28.5 74.5 32 74.5C35.5 74.5 38.5 68.5 38.5 59C38.5 47 36 39.5 32 38Z" />
                <path fill="#a7abb7" d="M44 58C44 43 38.5 30.5 32 29C36.5 32.5 40.2 44 40.2 58.5C40.2 69 36.8 78 32 79C39 79 44 70 44 58Z" />
                <path fill="none" stroke="#eef0f4" strokeWidth="0.9" strokeLinecap="round" d="M21.6 49C21.2 54 21.3 61 22.2 66" />
                <path fill="none" stroke="#7f8391" strokeWidth="1" strokeLinecap="round" d="M21.5 42.5H26.2" />
                <rect y="74" width="64" height="6" fill="url(#clasp-in-slot)" clipPath="url(#clasp-wire)" />
              </g>
            </g>
          </svg>
          <div className="badge" data-badge>
            <div className="badge-inner">
              <div className="face front on-stock" data-face="front">
                <span className="slot" aria-hidden="true" />
                <p className="badge-head"><span>{badgeAddress(p)}</span><span>Portfolio</span></p>
                <div className={photo ? "badge-id" : "badge-id no-photo"}>
                  {photo ? (
                    <img className="badge-photo" src={photo.url} srcSet={photo.srcSet} sizes="120px" alt={photo.alt} width={photo.width} height={photo.height} />
                  ) : null}
                  <div>
                    <p className="badge-role">{p.role}</p>
                    <p className="badge-stack">{p.stackLine}</p>
                  </div>
                </div>
                <h1 className="badge-name" data-fit>
                  <span className="first">{p.firstName}</span>{" "}
                  <span className="last">{p.lastName}</span>
                </h1>
                <div className="badge-foot">
                  <p className="avail">
                    <span className={p.openToWork ? "live" : undefined}>{p.openToWorkLabel}</span>
                    <span>{p.availabilityNote}</span>
                  </p>
                </div>
              </div>

              <div className="face back on-stock" data-face="back" inert>
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                <div className="back-body">
                  <h2>Scan to take my CV with you</h2>
                  <div className="qr">
                    <img src={qrDataUrl} alt="QR code linking to the CV page" width={196} height={196} />
                  </div>
                  <a className="btn btn-ink" href={withBase("/cv")}>Download CV <Icon name="download" /></a>
                  <div className="back-links">
                    <a href={`mailto:${p.email}`}><Icon name="mail" /><span>{p.email}</span></a>
                    <a href={p.githubUrl}><Icon name="github" /><span>{displayUrl(p.githubUrl)}</span></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* the agents' log: a printed slip beside the lanyard's strap that follows the hero's build (home-motion.ts writes
            it; this is its resting text) */}
        <div className="hero-log" data-hero-log aria-hidden="true">
          <p className="log-head"><span className="log-dot" />Agent log</p>
          <ol className="log-lines" data-log-lines>
            <li>Built live by AI agents, on every visit</li>
          </ol>
        </div>

        <ul className="stickers" data-stickers aria-label="Projects">
          {showcase.map(({ pr, shot }, i) => (
            <li key={pr.id} className={`slot-li ${SLOTS[i]}`}>
              <span className="float">
                <a className="sticker" href={`#p-${pr.slug}`}>
                  <img src={shot.url} srcSet={shot.srcSet} sizes="(max-width: 860px) 60vw, 270px" alt={shot.alt} width={shot.width} height={shot.height} loading={i < 1 ? undefined : "lazy"} />
                  <span className="sticker-cap cap-top">{pr.stickerCaption} <Icon name="arrow-ur" /></span>
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="statement">
        {/* a poster: the lines alternate a tall condensed cut, the expanded black and an outline, and home-motion.ts
            sets each one to the column's width (data-fit-line), so a short line prints large */}
        <p className="lede" data-lede>
          {lines.map((line, i) => (
            <span key={i} className={["line", LINE_LOOKS[i % LINE_LOOKS.length]].filter(Boolean).join(" ")}>
              <span data-fit-line>
                {i === lead ? <Switched text={line} tiltFrom={tiltAt(i)} /> : <Inline text={line} icons tiltFrom={tiltAt(i)} />}
              </span>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/** The badge band fits about 24 characters. A longer site address (no custom domain yet) shows the GitHub profile instead. */
function badgeAddress(p: { siteUrl: string; githubUrl: string }): string {
  const site = displayUrl(p.siteUrl);
  return site.length <= 24 ? site : displayUrl(p.githubUrl);
}
