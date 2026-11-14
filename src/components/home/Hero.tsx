import { Icon } from "@/components/Icon";
import type { HomeContent } from "@/content/home";
import { displayUrl } from "@/lib/url";

const SLOTS = ["s-a", "s-b", "s-c", "s-d"] as const;

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
              <pattern id="webbing-tab" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="#e5e4df" /><image href="/textures/webbing.png" width="16" height="16" /></pattern>
              <linearGradient id="tab-fold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111216" stopOpacity="0" /><stop offset="1" stopColor="#111216" stopOpacity="0.26" /></linearGradient>
            </defs>
            <path fill="url(#webbing-tab)" d="M16 0H48V40.6Q48 44 44.6 44H19.4Q16 44 16 40.6Z" />
            <path fill="url(#tab-fold)" d="M16 33H48V40.6Q48 44 44.6 44H19.4Q16 44 16 40.6Z" />
            <rect x="16" y="0" width="2" height="41" fill="#fff" fillOpacity="0.35" />
            <rect x="45" y="0" width="3" height="41" fill="#111216" fillOpacity="0.2" />
            <g fill="none" stroke="#1d2640" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2.6 2"><rect x="20.5" y="6" width="23" height="21" rx="1" /><path d="M20.5 6L43.5 27M43.5 6L20.5 27" /></g>
          </svg>
          {/* swivel: its eye hooks the ring's point (the ring wire shows through the eye); lobster clasp below, its hook dropping into the badge slot */}
          <svg className="hw hw-clasp" viewBox="0 0 64 80" aria-hidden="true">
            <defs>
              <clipPath id="clasp-above-slot"><rect width="64" height="79" /></clipPath>
              <clipPath id="clasp-shape"><path d="M32 29C23.5 31 20.5 48 22.5 62C24 73.5 28.5 84 32 84C35.5 84 40 73.5 41.5 62C43.5 48 40.5 31 32 29Z" /></clipPath>
            </defs>
            <rect x="29.4" y="1.6" width="5.2" height="14" rx="2.6" fill="none" stroke="#a7abb7" strokeWidth="2.2" />
            <rect x="26" y="14" width="12" height="11" rx="3.2" fill="#c9ccd6" />
            <rect x="26" y="19.4" width="12" height="2.2" fill="#a7abb7" />
            <rect x="30" y="25" width="4" height="5" fill="#7f8391" />
            <g clipPath="url(#clasp-above-slot)">
              <rect x="21.5" y="48.5" width="3" height="5" fill="#a7abb7" />
              <rect x="17.5" y="45" width="5.5" height="12" rx="2" fill="#a7abb7" />
              <path fill="#c9ccd6" fillRule="evenodd" d="M32 29C23.5 31 20.5 48 22.5 62C24 73.5 28.5 84 32 84C35.5 84 40 73.5 41.5 62C43.5 48 40.5 31 32 29ZM32 38C28.4 40 27.6 51 28.8 60.5C29.6 67 31 71.5 32 71.5C33 71.5 34.4 67 35.2 60.5C36.4 51 35.6 40 32 38Z" />
              <path fill="#a7abb7" d="M41.5 62C43.5 48 40.5 31 32 29C37.6 32.5 39.2 47 37 59.5C35.8 67 34.2 76 32 84C35.5 84 40 73.5 41.5 62Z" />
              <path fill="none" stroke="#7f8391" strokeWidth="1.1" strokeLinecap="round" d="M36.6 44C37.9 50 37.9 56 36.4 62" />
              <rect y="73" width="64" height="7" fill="#111216" fillOpacity="0.4" clipPath="url(#clasp-shape)" />
            </g>
          </svg>
          <div className="badge" data-badge>
            <div className="badge-inner">
              <div className="face front on-stock" data-face="front">
                <span className="slot" aria-hidden="true" />
                <p className="badge-head"><span>{displayUrl(p.siteUrl)}</span><span>Portfolio</span></p>
                <div className={photo ? "badge-id" : "badge-id no-photo"}>
                  {photo ? (
                    <img className="badge-photo" src={photo.url} srcSet={photo.srcSet} sizes="120px" alt={photo.alt} width={photo.width} height={photo.height} />
                  ) : null}
                  <div>
                    <p className="badge-role">{p.role}</p>
                    <p className="badge-stack">{p.stackLine}</p>
                  </div>
                </div>
                <h1 className="badge-name">
                  <span className="first" data-fit>{p.firstName}</span>{" "}
                  <span className="last">{p.lastName}</span>
                </h1>
                <div className="badge-foot">
                  <div className="flip-row">
                    <span>CV and contact on the back</span>
                    <button className="flip-btn" type="button" data-flip aria-label="Flip badge to see CV and contact">
                      <Icon name="flip" />Flip
                    </button>
                  </div>
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
                  <a className="btn btn-ink" href="/cv">Download CV <Icon name="download" /></a>
                  <div className="back-links">
                    <a href={`mailto:${p.email}`}><Icon name="mail" /><span>{p.email}</span></a>
                    <a href={p.githubUrl}><Icon name="github" /><span>{displayUrl(p.githubUrl)}</span></a>
                  </div>
                  <button className="flip-btn" type="button" data-flip aria-label="Flip badge back to the front">
                    <Icon name="flip" />Front
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul className="stickers" data-stickers aria-label="Projects">
          {projects.map((pr, i) =>
            pr.screenshot ? (
              <li key={pr.id} className={`slot-li ${SLOTS[i]}`}>
                <a className="sticker" href={`#p-${pr.slug}`}>
                  <img src={pr.screenshot.url} srcSet={pr.screenshot.srcSet} sizes="(max-width: 860px) 60vw, 330px" alt={pr.screenshot.alt} width={pr.screenshot.width} height={pr.screenshot.height} loading={i < 2 ? undefined : "lazy"} />
                  <span className="sticker-cap">{pr.stickerCaption} <Icon name="arrow-ur" /></span>
                </a>
              </li>
            ) : null,
          )}
          {seal ? (
            <li className="slot-li s-award">
              <a className="sticker" href="#achievements">
                <span className="seal"><span><b>{seal.sealText}</b><small><SealCaption text={seal.sealCaption} /></small></span></span>
                <span className="sticker-cap">{seal.caption} <Icon name="arrow-ur" /></span>
              </a>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="statement">
        <p className="lede" data-lede>
          <span className="line"><span>{p.statementLine1}</span></span>
          <span className="line"><span>{p.statementLine2}</span></span>
        </p>
        <div className="hero-actions">
          <a className="btn btn-stock" href="#work">See the work <Icon name="arrow-ur" /></a>
          <a className="btn btn-line" href="/cv">Download CV <Icon name="download" /></a>
        </div>
      </div>
    </section>
  );
}
