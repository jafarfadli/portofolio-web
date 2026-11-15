"use client";

import { Fragment, useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/admin/actions";
import type { Field } from "@/admin/fields";
import type { MediaOptions } from "@/admin/media-options";
import { FieldInput } from "./FieldInput";
import { formatBytes } from "./shrink-image";

/** Under the 40 MB the server accepts per save (next.config.ts), with room for the text fields and multipart framing. */
const MAX_SEND = 36 * 1024 * 1024;

/**
 * A body over the server's cap is cut off before the save action runs, which ends in an error page. So the form
 * checks what it is about to send and says what to do instead. Returns the message, or null when the form can go.
 */
function blockedSend(form: HTMLFormElement): string | null {
  if (form.querySelector("[data-preparing]")) return "An image is still being prepared. Save again in a moment.";
  let total = 0;
  for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    for (const f of input.files ?? []) total += f.size;
  }
  return total > MAX_SEND
    ? `The new images add up to ${formatBytes(total)}, more than one save can carry (${formatBytes(MAX_SEND)}). Save with fewer new images, then add the rest.`
    : null;
}

type Props = {
  fields: readonly Field[];
  initial: Record<string, string>;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  media: MediaOptions;
  submitLabel: string;
  justSaved?: boolean;
};

/**
 * Generic editor form. React resets uncontrolled fields after an action, so the action returns the values to show
 * next: the saved values after a save, or exactly what was typed after a validation error.
 */
export function ResourceForm({ fields, initial, action, media, submitLabel, justSaved = false }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {
    status: justSaved ? "saved" : "idle",
    errors: {},
  });
  const [blocked, setBlocked] = useState<string | null>(null);
  const values = state.values ?? initial;
  const fieldErrors = Object.keys(state.errors).filter((k) => k !== "_form").length;
  // While a submit runs, the previous result would be stale, so the status line stays empty until the new one lands.
  const kind = blocked ? "error" : pending ? "idle" : state.status;
  const message = blocked
    ? blocked
    : pending
    ? ""
    : state.status === "saved"
      ? "Saved."
      : state.status === "error"
        ? (state.message ?? `Fix ${fieldErrors} ${fieldErrors === 1 ? "field" : "fields"} below.`)
        : "";
  const input = (f: Field) => (
    <FieldInput key={f.name} field={f} value={values[f.name] ?? ""} error={state.errors[f.name]} media={media} />
  );
  const main = fields.filter((f) => !f.more);
  const more = fields.filter((f) => f.more);
  // A closed group would hide an error, so it opens when one of its fields fails.
  const moreHasError = more.some((f) => state.errors[f.name]);
  return (
    <form
      action={formAction} className="adm-form" noValidate
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        const why = blockedSend(e.currentTarget);
        setBlocked(why);
        if (why) e.preventDefault(); // React skips the action when the submit is prevented
      }}
    >
      <p className="adm-status" data-kind={kind} role="status">{message}</p>
      {main.map((f) => (
        <Fragment key={f.name}>
          {f.section ? <h2 className="adm-section">{f.section}</h2> : null}
          {input(f)}
        </Fragment>
      ))}
      {more.length > 0 ? (
        <details className="adm-more" open={moreHasError || undefined} key={moreHasError ? "open" : "closed"}>
          <summary>More options <span className="adm-optional">({more.map((f) => f.label).join(", ")})</span></summary>
          <div className="adm-more-body">{more.map(input)}</div>
        </details>
      ) : null}
      <div className="adm-actions">
        <button className="btn btn-ink" type="submit" disabled={pending}>{pending ? "Saving" : submitLabel}</button>
      </div>
    </form>
  );
}
