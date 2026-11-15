import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import type { HomeContent } from "@/content/home";
import { iconCount } from "@/lib/inline";
import { statementLines } from "@/lib/statement";
import { displayUrl } from "@/lib/url";
import { withBase } from "@/lib/base-path";

const SLOTS = ["s-a", "s-b", "s-c", "s-d"] as const;
/** The three screens float in a row along the hero's bottom edge, so their captions open above them. */
const CAP_TOP = new Set<string>(["s-a", "s-c", "s-d"]);

/** The seal prints its caption on two lines: everything before the last word, then the last word (the year). */
function SealCaption({ text }: { text: string | null }) {
  if (!text) return null;
  const cut = text.lastIndexOf(" ");
  if (cut < 0) return <>{text}</>;
  return <>{text.slice(0, cut)}<br />{text.slice(cut + 1)}</>;
}

export function Hero({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p, photo, projects, achievements } = content;
  const seal = achievements.find((a) => a.sealText);
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

        <ul className="stickers" data-stickers aria-label="Projects">
          {projects.map((pr, i) =>
            pr.screenshot ? (
              <li key={pr.id} className={`slot-li ${SLOTS[i]}`}>
                <span className="float">
                  <a className="sticker" href={`#p-${pr.slug}`}>
                    <img src={pr.screenshot.url} srcSet={pr.screenshot.srcSet} sizes="(max-width: 860px) 60vw, 330px" alt={pr.screenshot.alt} width={pr.screenshot.width} height={pr.screenshot.height} loading={i < 2 ? undefined : "lazy"} />
                    <span className={CAP_TOP.has(SLOTS[i]) ? "sticker-cap cap-top" : "sticker-cap"}>{pr.stickerCaption} <Icon name="arrow-ur" /></span>
                  </a>
                </span>
              </li>
            ) : null,
          )}
          {seal ? (
            <li className="slot-li s-award">
              <span className="float">
                <a className="sticker" href="#achievements">
                  <span className="seal"><span><b>{seal.sealText}</b><small><SealCaption text={seal.sealCaption} /></small></span></span>
                  <span className="sticker-cap">{seal.caption} <Icon name="arrow-ur" /></span>
                </a>
              </span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="statement">
        <p className="lede" data-lede>
          {statementLines(p.statementLine1, p.statementLine2).map((line, i, lines) => (
            <span key={i} className="line"><span><Inline text={line} icons tiltFrom={lines.slice(0, i).reduce((n, l) => n + iconCount(l), 0)} /></span></span>
          ))}
        </p>
        <div className="hero-actions">
          <a className="btn btn-stock" href="#work">See the work <Icon name="arrow-ur" /></a>
          <a className="btn btn-line" href={withBase("/cv")}>Download CV <Icon name="download" /></a>
        </div>
      </div>
    </section>
  );
}

/** The badge band fits about 24 characters. A longer site address (no custom domain yet) shows the GitHub profile instead. */
function badgeAddress(p: { siteUrl: string; githubUrl: string }): string {
  const site = displayUrl(p.siteUrl);
  return site.length <= 24 ? site : displayUrl(p.githubUrl);
}
