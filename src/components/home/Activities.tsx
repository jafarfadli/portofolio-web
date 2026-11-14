import type { HomeActivity } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Activities({ items }: { items: HomeActivity[] }) {
  const first = items.find((a) => a.photo)?.photo;
  return (
    <section className="section" id="activities" aria-labelledby="act-h">
      <SectionHead id="act-h" title="Activities" lead="Where I show up outside of work: talks, hackathons, mentoring." />
      <ol className="agenda" data-agenda>
        {items.map((a) => {
          const inner = (
            <>
              <span className="yr">{a.year}</span>
              <span className="title">{a.title}<small>{a.subtitle}</small></span>
              <span className="role" data-role={a.role}>{a.roleLabel}</span>
              {a.photo ? (
                <img className="thumb" src={a.photo.url} alt="" loading="lazy" width={a.photo.width} height={a.photo.height} />
              ) : null}
            </>
          );
          return (
            <li key={a.id}>
              {a.url ? (
                <a className="row" href={a.url} data-photo={a.photo?.url}>{inner}</a>
              ) : (
                <div className="row" tabIndex={0} data-photo={a.photo?.url}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      {first ? (
        <div className="preview" data-preview aria-hidden="true">
          <img alt="" src={first.url} />
        </div>
      ) : null}
    </section>
  );
}
