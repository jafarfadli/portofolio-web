"use client";

import { useActionState } from "react";
import { saveAlt, uploadMedia, type MediaFormState } from "@/admin/media-actions";

const kindOf = (s: MediaFormState) => (s.error ? "error" : s.done ? "saved" : "idle");

export function UploadForm() {
  const [state, action, pending] = useActionState<MediaFormState, FormData>(uploadMedia, {});
  const kind = state.kind ?? "screenshot";
  return (
    <form action={action} className="adm-upload">
      <div className="adm-field">
        <label htmlFor="up-file">Image</label>
        <input
          className="adm-input" id="up-file" name="file" type="file" required
          accept="image/jpeg,image/png,image/webp,image/avif" aria-describedby="up-file-help"
        />
        <p className="adm-help" id="up-file-help">JPEG, PNG, WebP or AVIF up to 15 MB. It is re-encoded, resized copies are made, and location data is removed.</p>
      </div>
      <div className="adm-field">
        <label htmlFor="up-kind">Kind</label>
        <select className="adm-input" id="up-kind" name="kind" key={kind} defaultValue={kind}>
          <option value="screenshot">Screenshot</option>
          <option value="photo">Photo</option>
          <option value="logo">Logo</option>
        </select>
      </div>
      <div className="adm-field adm-wide">
        <label htmlFor="up-alt">Alt text</label>
        <input className="adm-input" id="up-alt" name="alt" defaultValue={state.alt ?? ""} aria-describedby="up-alt-help" />
        <p className="adm-help" id="up-alt-help">What the image shows, for people using screen readers.</p>
      </div>
      <div className="adm-actions adm-wide">
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
