"use client";

import { useActionState, useEffect, useState } from "react";
import { saveAlt, uploadMedia, type MediaFormState } from "@/admin/media-actions";

const kindOf = (s: MediaFormState) => (s.error ? "error" : s.done ? "saved" : "idle");

export function UploadForm() {
  const [state, action, pending] = useActionState<MediaFormState, FormData>(uploadMedia, {});
  const kind = state.kind ?? "screenshot";
  const [preview, setPreview] = useState<{ url: string; name: string; size?: string } | null>(null);
  // The object URL lives only while it is shown; a new pick or leaving the page frees it.
  const previewUrl = preview?.url;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  // A finished upload resets the file input, so the preview of the old pick goes with it.
  const [shownFor, setShownFor] = useState(state);
  if (shownFor !== state) {
    setShownFor(state);
    if (state.done) setPreview(null);
  }
  return (
    <form action={action} className="adm-upload">
      <div className="adm-field adm-kind">
        <label htmlFor="up-kind">Kind</label>
        <select className="adm-input" id="up-kind" name="kind" key={kind} defaultValue={kind}>
          <option value="screenshot">Screenshot</option>
          <option value="photo">Photo</option>
          <option value="logo">Logo</option>
        </select>
      </div>
      <div className="adm-field">
        <label htmlFor="up-file">Image</label>
        <input
          className="adm-input" id="up-file" name="file" type="file" required
          accept="image/jpeg,image/png,image/webp,image/avif" aria-describedby="up-file-help"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? { url: URL.createObjectURL(file), name: file.name } : null);
          }}
        />
        {preview ? (
          <div className="adm-file-preview">
            <img
              src={preview.url} alt=""
              onLoad={(e) => {
                const img = e.currentTarget;
                const size = `${img.naturalWidth} by ${img.naturalHeight}`;
                setPreview((p) => (p && p.url === preview.url && p.size !== size ? { ...p, size } : p));
              }}
            />
            <span>{preview.name}{preview.size ? `, ${preview.size}` : ""}</span>
          </div>
        ) : null}
        <p className="adm-help" id="up-file-help">JPEG, PNG, WebP or AVIF up to 15 MB. It is re-encoded, resized copies are made, and location data is removed.</p>
      </div>
      <div className="adm-field">
        <label htmlFor="up-alt">Alt text</label>
        <input className="adm-input" id="up-alt" name="alt" defaultValue={state.alt ?? ""} aria-describedby="up-alt-help" />
        <p className="adm-help" id="up-alt-help">What the image shows, for people using screen readers.</p>
      </div>
      <div className="adm-actions">
        <button className="btn btn-ink" type="submit" disabled={pending}>{pending ? "Uploading" : "Upload"}</button>
        <p className="adm-status" id="upload-status" role="status" data-kind={kindOf(state)}>
          {state.error ?? state.notice ?? (state.done ? "Uploaded." : "")}
        </p>
      </div>
    </form>
  );
}

export function AltForm({ id, alt }: { id: number; alt: string }) {
  const [state, action, pending] = useActionState<MediaFormState, FormData>(saveAlt.bind(null, id), {});
  return (
    <form action={action} className="adm-form">
      <div className="adm-field">
        <label htmlFor={`alt-${id}`}>Alt text<span className="sr-only"> for image {id}</span></label>
        <input className="adm-input" id={`alt-${id}`} name="alt" defaultValue={state.alt ?? alt} />
      </div>
      <div className="adm-actions">
        <button className="adm-mini" type="submit" disabled={pending}>Save alt text<span className="sr-only"> for image {id}</span></button>
        <p className="adm-status" role="status" data-kind={kindOf(state)}>{state.error ?? (state.done ? "Saved." : "")}</p>
      </div>
    </form>
  );
}
