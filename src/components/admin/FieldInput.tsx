"use client";

import type { Field } from "@/admin/fields";
import type { MediaOptions } from "@/admin/media-options";

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
  if (f.kind === "textarea" || f.kind === "lines" || f.kind === "cardArt") {
    control = (
      <textarea
        className={`adm-input${f.kind === "cardArt" ? " is-code" : ""}`}
        rows={f.rows ?? 4} spellCheck={f.kind !== "cardArt"} defaultValue={value} {...a11y}
      />
    );
  } else if (f.kind === "enum") {
    control = (
      <select className="adm-input" defaultValue={value} {...a11y}>
        {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (f.kind === "media") {
    control = (
      <select className="adm-input" defaultValue={value} {...a11y}>
        <option value="">None</option>
        {media[f.mediaKind ?? "screenshot"].map((o) => <option key={o.id} value={String(o.id)}>{o.label}</option>)}
      </select>
    );
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
