import Link from "next/link";
import { notFound } from "next/navigation";
import { moveResource, toggleResource } from "@/admin/actions";
import { FLAG_LABELS, getResource, type Resource } from "@/admin/resources";
import { listItems, type Row } from "@/admin/store";
import { requireAdminPage } from "@/auth/admin";
import { getDb } from "@/db/client";

const NOTICES: Record<string, string> = {
  deleted: "Deleted.",
  "featured-cap": "Only 4 projects can be featured. Unfeature another one first.",
};

type Props = {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ListPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const res = getResource((await params).resource);
  if (!res) notFound();
  const notice = (await searchParams).notice;
  const rows = listItems(getDb(), res.key);

  return (
    <>
      <div className="adm-head">
        <h1>{res.title}</h1>
        <Link className="btn btn-ink" href={`/admin/${res.key}/new`}>Add {res.singular}</Link>
      </div>
      {typeof notice === "string" && NOTICES[notice] ? <p className="adm-notice" role="status">{NOTICES[notice]}</p> : null}
      {rows.length === 0 ? (
        <p className="adm-empty">Nothing here yet. Add the first {res.singular}.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">{res.title}</th>
              {res.flags.map((f) => <th scope="col" key={f}>{FLAG_LABELS[f]}</th>)}
              <th scope="col"><span className="sr-only">Order</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>
                  <Link className="adm-title" href={`/admin/${res.key}/${row.id}`}>{res.rowTitle(row)}</Link>
                  {row.metricIsSample ? <span className="adm-tag">Sample metric</span> : null}
                  <span className="adm-note">{res.rowNote(row)}</span>
                </td>
                {res.flags.map((flag) => <td key={flag}><FlagButton res={res} row={row} flag={flag} /></td>)}
                <td>
                  <div className="adm-order">
                    <form action={moveResource.bind(null, res.key, row.id, -1)}>
                      <button className="adm-mini" type="submit" disabled={i === 0} aria-label={`Move ${res.rowTitle(row)} up`}>Up</button>
                    </form>
                    <form action={moveResource.bind(null, res.key, row.id, 1)}>
                      <button className="adm-mini" type="submit" disabled={i === rows.length - 1} aria-label={`Move ${res.rowTitle(row)} down`}>Down</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** The printed word never changes; aria-pressed and the solid or dashed outline show the state. */
function FlagButton({ res, row, flag }: { res: Resource; row: Row; flag: keyof typeof FLAG_LABELS }) {
  const on = Boolean(row[flag]);
  return (
    <form action={toggleResource.bind(null, res.key, row.id, flag, !on)}>
      <button className="adm-mini" type="submit" aria-pressed={on}>
        {FLAG_LABELS[flag]}
        <span className="sr-only">: {res.rowTitle(row)}</span>
      </button>
    </form>
  );
}
