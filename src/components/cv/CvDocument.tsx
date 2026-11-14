import { Inline } from "@/components/Inline";
import type { CvContent } from "@/content/cv";
import { fullName } from "@/lib/name";
import { displayUrl } from "@/lib/url";

export function CvDocument({ cv }: { cv: CvContent }) {
  const p = cv.profile;
  return (
    <article className="cv-sheet" aria-label="Curriculum vitae">
      <header className="cv-head">
        <h1>{fullName(p)}</h1>
        <p className="cv-role">{p.role}</p>
        <ul className="contact">
          <li>{p.cvLocationLine}</li>
          <li><a href={`mailto:${p.email}`}>{p.email}</a></li>
          <li>{displayUrl(p.siteUrl)}</li>
          <li>{displayUrl(p.githubUrl)}</li>
          <li>{displayUrl(p.linkedinUrl)}</li>
        </ul>
      </header>

      <section className="cv-sec">
        <h2>Summary</h2>
        <p>{cv.summary}</p>
      </section>

      {cv.experiences.length > 0 ? (
        <section className="cv-sec">
          <h2>Experience</h2>
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
          <h2>Selected projects</h2>
          {cv.projects.map((pr) => (
            <div key={pr.id} className="cv-entry">
              <div className="cv-row">
                <span><b>{pr.name}</b>, {pr.cvTitle}</span>
                <span className="when">{pr.period}</span>
              </div>
              <ul className="cv-points">
                <li><Inline text={pr.cvLine} /> <span className="cv-stack">{pr.tags.join(", ")}</span></li>
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {cv.achievements.length > 0 ? (
        <section className="cv-sec">
          <h2>Achievements</h2>
          <ul className="cv-lines">
            {cv.achievements.map((a) => (
              <li key={a.id}><span>{a.rankLabel} <Inline text={a.cvLine} /></span><span className="when">{a.cvYear}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {cv.activities.length > 0 ? (
        <section className="cv-sec">
          <h2>Activities</h2>
          <ul className="cv-lines">
            {cv.activities.map((a) => (
              <li key={a.id}><span>{a.roleLabel} <Inline text={a.cvLine} /></span><span className="when">{a.year}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {cv.education.length > 0 ? (
        <section className="cv-sec">
          <h2>Education</h2>
          {cv.education.map((e) => (
            <div key={e.id} className="cv-entry">
              <div className="cv-row"><span><b>{e.degree}</b></span><span className="when">{e.period}</span></div>
              <div><Inline text={e.cvNote} /></div>
            </div>
          ))}
        </section>
      ) : null}

      {cv.skillGroups.length > 0 ? (
        <section className="cv-sec cv-skills">
          <h2>Skills</h2>
          {cv.skillGroups.map((g) => (
            <p key={g.group}><b>{g.group}:</b> {g.names.join(", ")}</p>
          ))}
        </section>
      ) : null}
    </article>
  );
}
