import { listMedia } from "@/admin/media";
import { removeMedia } from "@/admin/media-actions";
import { requireAdminPage } from "@/auth/admin";
import { AltForm, UploadForm } from "@/components/admin/MediaForms";
import { mediaUrl } from "@/content/home";
import { getDb } from "@/db/client";

const NOTICES: Record<string, string> = {
  deleted: "Deleted.",
  "in-use": "That image is still in use. Pick another image on the items listed under it first.",
};
const KIND_LABEL = { screenshot: "Screenshot", photo: "Photo", logo: "Logo" } as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MediaPage({ searchParams }: Props) {
  await requireAdminPage();
  const notice = (await searchParams).notice;
  const items = listMedia(getDb());
  return (
    <>
      <div className="adm-head"><h1>Media</h1></div>
      {typeof notice === "string" && NOTICES[notice] ? <p className="adm-notice" role="status">{NOTICES[notice]}</p> : null}
      <UploadForm />
      {items.length === 0 ? (
        <p className="adm-empty">No images yet. Upload the first screenshot above.</p>
      ) : (
        <ul className="adm-media">
          {items.map((m) => {
            const thumb = m.variants.find((v) => v.width === 480) ?? m;
            return (
              <li key={m.id}>
                <a className="adm-thumb-link" href={mediaUrl(m.path)} target="_blank" rel="noreferrer">
                  <img className="adm-thumb" src={mediaUrl(thumb.path)} alt={m.alt} width={thumb.width} height={thumb.height} loading="lazy" />
                  <span className="sr-only">Open image {m.id} full size, in a new tab</span>
                </a>
                <p className="adm-meta">
                  {KIND_LABEL[m.kind]}, {m.width} by {m.height}.{" "}
                  {m.usedBy.length > 0 ? `Used by ${m.usedBy.join(", ")}.` : "Not used yet."}
                </p>
                <AltForm id={m.id} alt={m.alt} />
                {m.usedBy.length === 0 ? (
                  <details className="adm-danger">
                    <summary>Delete image<span className="sr-only"> {m.id}</span></summary>
                    <p>The file and its resized copies are removed. This cannot be undone.</p>
                    <form action={removeMedia.bind(null, m.id)}>
                      <button className="btn btn-ink" type="submit">Delete for good</button>
                    </form>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
