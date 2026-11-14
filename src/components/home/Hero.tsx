import { Icon } from "@/components/Icon";
import type { HomeContent } from "@/content/home";
import { displayUrl } from "@/lib/url";

const SLOTS = ["s-a", "s-b", "s-c", "s-d"] as const;

export function Hero({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p, projects, achievements } = content;
  const seal = achievements.find((a) => a.sealText);
  const fullName = `${p.firstName} ${p.lastName}`;
  const strap = Array.from({ length: 4 }, () => fullName.toUpperCase()).join("   ");

  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-stage">
        <div className="pendulum" data-pendulum>
          <div className="strap" aria-hidden="true"><span>{strap}</span></div>
          <div className="clasp" aria-hidden="true" />
          <div className="badge" data-badge>
            <div className="badge-inner">
              <div className="face front on-stock" data-face="front">
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                <h1 className="badge-name">
                  <span className="first" data-fit>{p.firstName}</span>{" "}
                  <span className="last">{p.lastName}</span>
                </h1>
                <p className="badge-role">{p.role}</p>
                <p className="badge-stack">{p.stackLine}</p>
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
                <a className={`sticker${i === 0 ? " is-resting" : ""}`} href={`#p-${pr.slug}`}>
                  <img src={pr.screenshot.url} srcSet={pr.screenshot.srcSet} sizes="(max-width: 860px) 60vw, 330px" alt={pr.screenshot.alt} width={pr.screenshot.width} height={pr.screenshot.height} loading={i < 2 ? undefined : "lazy"} />
                  <span className={`sticker-cap${i === 0 ? " cap-top" : ""}`}>{pr.stickerCaption} <Icon name="arrow-ur" /></span>
                </a>
              </li>
            ) : null,
          )}
          {seal ? (
            <li className="slot-li s-award">
              <a className="sticker" href="#achievements">
                <span className="seal"><span><b>{seal.sealText}</b><small>{seal.sealCaption}</small></span></span>
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
