import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteResource, saveResource } from "@/admin/actions";
import { toFormValues } from "@/admin/fields";
import { mediaOptions } from "@/admin/media-options";
import { getResource } from "@/admin/resources";
import { getItem } from "@/admin/store";
import { requireAdminPage } from "@/auth/admin";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { getDb } from "@/db/client";

type Props = {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const { resource, id } = await params;
  const res = getResource(resource);
  if (!res) notFound();
  const db = getDb();
  const isNew = id === "new";
  const rowId = isNew ? null : Number(id);
  if (rowId !== null && !(Number.isInteger(rowId) && rowId > 0)) notFound();
  const row = rowId === null ? undefined : getItem(db, res.key, rowId);
  if (rowId !== null && !row) notFound();

  return (
    <>
      <div className="adm-head">
        <h1>{row ? res.rowTitle(row) : `New ${res.singular}`}</h1>
        <Link className="btn btn-ink-line" href={`/admin/${res.key}`}>Back to {res.title.toLowerCase()}</Link>
      </div>
      <ResourceForm
        fields={res.fields}
        initial={toFormValues(res.fields, row ?? res.defaults)}
        action={saveResource.bind(null, res.key, rowId)}
        media={mediaOptions(db)}
        submitLabel={row ? "Save changes" : `Add ${res.singular}`}
        justSaved={(await searchParams).saved === "1"}
      />
      {row ? (
        <details className="adm-danger">
          <summary>Delete this {res.singular}</summary>
          <p>It disappears from the site and from every CV. This cannot be undone.</p>
          <form action={deleteResource.bind(null, res.key, row.id)}>
            <button className="btn btn-ink" type="submit">Delete for good</button>
          </form>
        </details>
      ) : null}
    </>
  );
}
