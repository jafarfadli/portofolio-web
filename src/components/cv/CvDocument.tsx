import { Fragment } from "react";
import { Inline } from "@/components/Inline";
import { Icon } from "@/components/Icon";
import type { CvContent } from "@/content/cv";
import { fullName } from "@/lib/name";
import { displayUrl } from "@/lib/url";

/**
 * Literal spaces between inline tags and words are deliberate: they keep `pdftotext` output
 * readable for ATS ("Next.js Go PostgreSQL", not "Next.jsGoPostgreSQL").
 */
export function CvDocument({ cv }: { cv: CvContent }) {
  const p = cv.profile;
  const photo = cv.photo;
  return (
    <article className="cv-sheet" aria-label="Curriculum vitae">
      <span className="cv-slot" aria-hidden="true" />
      <header className={photo ? "cv-head" : "cv-head cv-head-solo"}>
        <div>
          <h1>{fullName(p)}</h1>
          <p className="cv-role">{p.role}</p>
          <ul className="contact">
            <li><Icon name="pin" />{p.cvLocationLine}</li>
            <li><Icon name="mail" /><a href={`mailto:${p.email}`}>{p.email}</a></li>
            <li><Icon name="globe" />{displayUrl(p.siteUrl)}</li>
            <li><Icon name="github" />{displayUrl(p.githubUrl)}</li>
            <li><Icon name="linkedin" />{displayUrl(p.linkedinUrl)}</li>
          </ul>
        </div>
        {photo ? (
          <figure className="cv-photo">
            <img src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} />
          </figure>
        ) : null}
      </header>

      <div className="cv-body">
        <section className="cv-sec">
          <h2><span>Summary</span></h2>
          <p className="cv-summary"><Inline text={cv.summary} /></p>
        </section>

        {cv.experiences.length > 0 ? (
          <section className="cv-sec stops">
            <h2><span>Experience</span></h2>
            {cv.experiences.map((e) => (
              <div key={e.id} className="cv-entry">
                <div className="cv-row">
                  <span><b>{e.role}</b>, <span className="org">{[e.org, e.location].filter(Boolean).join(", ")}</span></span>
                  <span className="when">{e.cvPeriod}</span>
                </div>
                {e.cvBullets.length > 0 ? (
                  <ul className="cv-points">{e.cvBullets.map((b, i) => <li key={i}><Inline text={b} /></li>)}</ul>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {cv.projects.length > 0 ? (
          <section className="cv-sec">
            <h2><span>Selected projects</span></h2>
            {cv.projects.map((pr) => (
              <div key={pr.id} className="cv-entry">
                <div className="cv-row">
                  <span>
                    <b>{pr.name}</b>{pr.cvTitle ? `, ${pr.cvTitle}` : ""}{" "}
                    <span className="tags">
                      {pr.tags.map((t, i) => (
                        <Fragment key={`${t}-${i}`}>{i > 0 ? " " : ""}<span>{t}</span></Fragment>
                      ))}
                    </span>
                  </span>
                  <span className="when">{pr.period}</span>
                </div>
                <ul className="cv-points">
                  <li><Inline text={pr.cvLine} /></li>
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {cv.achievements.length > 0 ? (
          <section className="cv-sec">
            <h2><span>Achievements</span></h2>
            <ul className="cv-lines">
              {cv.achievements.map((a) => (
                <li key={a.id}>
                  <span className={`tag-cut ${a.rank}`}>{a.rankLabel}</span>{" "}
                  <span><Inline text={a.cvLine} /></span>
                  <span className="when">{a.cvYear}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cv.activities.length > 0 ? (
          <section className="cv-sec">
            <h2><span>Activities</span></h2>
            <ul className="cv-lines">
              {cv.activities.map((a) => (
                <li key={a.id}>
                  <span className={`tag-cut ${a.role}`}>{a.roleLabel}</span>{" "}
                  <span><Inline text={a.cvLine} /></span>
                  <span className="when">{a.year}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cv.education.length > 0 ? (
          <section className="cv-sec stops">
            <h2><span>Education</span></h2>
            {cv.education.map((e) => (
              <div key={e.id} className="cv-entry">
                <div className="cv-row">
                  <span><b>{e.degree}</b>, <span className="org">{e.institution}</span></span>
                  <span className="when">{e.period}</span>
                </div>
                <div><Inline text={e.cvNote} /></div>
              </div>
            ))}
          </section>
        ) : null}

        {cv.skillGroups.length > 0 ? (
          <section className="cv-sec cv-skills">
            <h2><span>Skills</span></h2>
            {cv.skillGroups.map((g) => (
              <p key={g.group}>
                <b>{g.group}</b>{" "}
                <span className="chips">
                  {g.names.map((n, i) => (
                    <Fragment key={`${n}-${i}`}>{i > 0 ? " " : ""}<span className="chip">{n}</span></Fragment>
                  ))}
                </span>
              </p>
            ))}
          </section>
        ) : null}
      </div>
      <span className="cv-foot" aria-hidden="true" />
    </article>
  );
}
