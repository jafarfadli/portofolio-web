"use client";

import { useEffect, useRef, useState } from "react";
import type { Field } from "@/admin/fields";
import type { MediaOption, MediaOptions } from "@/admin/media-options";
import { ArticleEditor } from "./ArticleEditor";
import { formatBytes, shrinkImage } from "./shrink-image";

type Props = { field: Field; value: string; error?: string; media: MediaOptions };

/** One labelled control. Help and error are tied to it with aria-describedby; the error sits right under it. */
export function FieldInput({ field: f, value, error, media }: Props) {
  const id = `f-${f.name}`;
  const helpId = f.help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  const a11y = { id, name: f.name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  const help = helpId ? <p className="adm-help" id={helpId}>{f.help}</p> : null;
  const err = errorId ? <p className="adm-error" id={errorId}>{error}</p> : null;

  if (f.kind === "bool") {
    return (
      <div className="adm-field">
        <label className="adm-check"><input type="checkbox" {...a11y} defaultChecked={value === "on"} />{f.label}</label>
        {err}
        {help}
      </div>
    );
  }

  let control: React.ReactNode;
  if (f.kind === "article") {
    control = <ArticleEditor value={value} a11y={a11y} rows={f.rows} error={error} />;
  } else if (f.kind === "textarea" || f.kind === "lines" || f.kind === "cardArt") {
    control = (
      <textarea
        className={`adm-input${f.kind === "cardArt" ? " is-code" : ""}`}
        rows={f.rows ?? 4} spellCheck={f.kind !== "cardArt"} defaultValue={value} {...a11y}
      />
    );
  } else if (f.kind === "enum") {
    control = (
      <select key={value} className="adm-input" defaultValue={value} {...a11y}>
        {(f.options ?? []).map((o) => <option key={o} value={o}>{f.optionLabels?.[o] ?? o}</option>)}
      </select>
    );
  } else if (f.kind === "media") {
    control = <ImageField key={value} name={f.name} label={f.label} value={value} options={media} a11y={a11y} />;
  } else {
    const type = f.kind === "url" ? "url" : f.kind === "email" ? "email" : f.kind === "number" ? "number" : "text";
    control = <input className="adm-input" type={type} step={f.kind === "number" ? "any" : undefined} defaultValue={value} {...a11y} />;
  }

  return (
    <div className="adm-field">
      <label htmlFor={id}>
        {f.label}
        {f.empty ? <span className="adm-optional"> (optional)</span> : null}
      </label>
      {control}
      {err}
      {help}
    </div>
  );
}

type A11y = { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/**
 * An image field: the image it shows, a button to upload a new one, a picker to reuse one uploaded before, and the
 * image's alt text. The upload is stored when the form is saved (src/admin/images.ts); until then it only previews.
 */
function ImageField({ name, label, value, options, a11y }: { name: string; label: string; value: string; options: MediaOption[]; a11y: A11y }) {
  const [picked, setPicked] = useState(value);
  const current = options.find((o) => String(o.id) === picked);
  const [file, setFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [alt, setAlt] = useState(current?.alt ?? "");
  const fileInput = useRef<HTMLInputElement>(null);
  const picks = useRef(0);
  const fileUrl = file?.url;
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const clearFile = () => {
    picks.current++;
    if (fileInput.current) fileInput.current.value = "";
    setFile(null);
    setPreparing(false);
    setAlt(current?.alt ?? "");
  };
  const pick = async (input: HTMLInputElement) => {
    const original = input.files?.[0];
    const turn = ++picks.current;
    if (!original) return clearFile();
    setAlt("");
    setPreparing(true);
    const f = await shrinkImage(original);
    if (turn !== picks.current) return; // picked again or cancelled while this one was being scaled
    if (f !== original) {
      // The form sends what the input holds, so the smaller copy replaces the picked file there.
      const dt = new DataTransfer();
      dt.items.add(f);
      input.files = dt.files;
    }
    setFile({ url: URL.createObjectURL(f), name: original.name, size: f.size });
    setPreparing(false);
  };
  const shows = file ? "new" : current ? "picked" : "none";
  return (
    <div className="adm-image">
      <div className="adm-image-preview">
        {file ? (
          <img src={file.url} alt="" />
        ) : current ? (
          <a href={current.full} target="_blank" rel="noreferrer" title="Open full size in a new tab">
            <img src={current.thumb} alt="" width={current.width} height={current.height} />
            <span className="sr-only">Open {label} full size, in a new tab</span>
          </a>
        ) : (
          <span className="adm-image-empty">No image</span>
        )}
      </div>
      <div className="adm-image-controls">
        <div className="adm-image-row">
          <label className="adm-mini adm-file">
            {shows === "none" ? "Upload an image" : "Upload a new one"}
            <input
              ref={fileInput} type="file" name={name + "__file"} accept={ACCEPT} className="sr-only"
              aria-label={`${label}: upload an image`} data-preparing={preparing || undefined}
              onChange={(e) => void pick(e.currentTarget)}
            />
          </label>
          {file || preparing ? <button type="button" className="adm-mini" onClick={clearFile}>Cancel upload</button> : null}
          {!file && !preparing && current ? <button type="button" className="adm-mini" onClick={() => { setPicked(""); setAlt(""); }}>Remove</button> : null}
        </div>
        {preparing ? <p className="adm-help">Preparing the image…</p> : null}
        {file ? <p className="adm-help">{file.name} ({formatBytes(file.size)}) is uploaded when you save.</p> : null}
        <div className="adm-image-reuse" hidden={!!file}>
          <label className="adm-sub" htmlFor={a11y.id}>Or use an image you uploaded before</label>
          <select
            className="adm-input" value={picked}
            onChange={(e) => { setPicked(e.target.value); setAlt(options.find((o) => String(o.id) === e.target.value)?.alt ?? ""); }}
            {...a11y}
          >
            <option value="">None</option>
            {options.map((o) => <option key={o.id} value={String(o.id)}>{o.label}</option>)}
          </select>
        </div>
        {shows !== "none" ? (
          <div className="adm-image-alt">
            <label className="adm-sub" htmlFor={`${a11y.id}-alt`}>Alt text</label>
            <input
              className="adm-input" id={`${a11y.id}-alt`} name={name + "__alt"} value={alt} onChange={(e) => setAlt(e.target.value)}
              placeholder="What the image shows, like: the inbox with two chats open"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
