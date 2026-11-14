"use client";

import { useActionState } from "react";
import type { FormState } from "@/admin/actions";
import type { Field } from "@/admin/fields";
import type { MediaOptions } from "@/admin/media-options";
import { FieldInput } from "./FieldInput";

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
  const values = state.values ?? initial;
  const fieldErrors = Object.keys(state.errors).filter((k) => k !== "_form").length;
  // While a submit runs, the previous result would be stale, so the status line stays empty until the new one lands.
  const kind = pending ? "idle" : state.status;
  const message = pending
    ? ""
    : state.status === "saved"
      ? "Saved."
      : state.status === "error"
        ? (state.message ?? `Fix ${fieldErrors} ${fieldErrors === 1 ? "field" : "fields"} below.`)
        : "";
  return (
    <form action={formAction} className="adm-form" noValidate>
      <p className="adm-status" data-kind={kind} role="status">{message}</p>
      {fields.map((f) => (
        <FieldInput key={f.name} field={f} value={values[f.name] ?? ""} error={state.errors[f.name]} media={media} />
      ))}
      <div className="adm-actions">
        <button className="btn btn-ink" type="submit" disabled={pending}>{pending ? "Saving" : submitLabel}</button>
      </div>
    </form>
  );
}
