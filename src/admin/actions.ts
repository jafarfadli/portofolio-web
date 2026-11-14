"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdminAction } from "@/auth/admin";
import { getDb } from "@/db/client";
import { echoValues, parseFields, toFormValues } from "./fields";
import { getResource, PROFILE_FIELDS, type Flag, type Resource } from "./resources";
import { checkMedia, deleteItem, moveItem, saveItem, saveProfile, setFlag } from "./store";

export type FormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors: Record<string, string>;
  values?: Record<string, string>;
};

// Bound arguments arrive from the browser like any other input, so each one is checked again here.
function resourceFor(key: unknown): Resource {
  const res = typeof key === "string" ? getResource(key) : undefined;
  if (!res) throw new Error("Unknown list");
  return res;
}
function idFrom(id: unknown): number {
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) throw new Error("Bad id");
  return id;
}

export async function saveResource(key: string, id: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  await assertAdminAction();
  const res = resourceFor(key);
  const rowId = id === null ? null : idFrom(id);
  const parsed = parseFields(res.fields, form);
  if (Object.keys(parsed.errors).length > 0) {
    return { status: "error", errors: parsed.errors, values: echoValues(res.fields, form) };
  }
  const result = saveItem(getDb(), res.key, rowId, parsed.values);
  if (!result.ok) {
    return { status: "error", errors: result.errors, message: result.errors._form, values: echoValues(res.fields, form) };
  }
  revalidatePath(`/admin/${res.key}`);
  if (rowId === null) redirect(`/admin/${res.key}/${result.id}?saved=1`);
  return { status: "saved", errors: {}, values: toFormValues(res.fields, parsed.values) };
}

export async function deleteResource(key: string, id: number): Promise<void> {
  await assertAdminAction();
  const res = resourceFor(key);
  deleteItem(getDb(), res.key, idFrom(id));
  revalidatePath(`/admin/${res.key}`);
  redirect(`/admin/${res.key}?notice=deleted`);
}

export async function moveResource(key: string, id: number, dir: number): Promise<void> {
  await assertAdminAction();
  const res = resourceFor(key);
  if (dir !== 1 && dir !== -1) throw new Error("Bad direction");
  moveItem(getDb(), res.key, idFrom(id), dir);
  revalidatePath(`/admin/${res.key}`);
}

export async function toggleResource(key: string, id: number, flag: Flag, value: boolean): Promise<void> {
  await assertAdminAction();
  const res = resourceFor(key);
  if (typeof value !== "boolean") throw new Error("Bad value");
  const result = setFlag(getDb(), res.key, idFrom(id), flag, value);
  if (!result.ok) redirect(`/admin/${res.key}?notice=${result.error}`);
  revalidatePath(`/admin/${res.key}`);
}

export async function saveProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  await assertAdminAction();
  const parsed = parseFields(PROFILE_FIELDS, form);
  if (Object.keys(parsed.errors).length > 0) {
    return { status: "error", errors: parsed.errors, values: echoValues(PROFILE_FIELDS, form) };
  }
  const mediaErrors = checkMedia(getDb(), PROFILE_FIELDS, parsed.values);
  if (Object.keys(mediaErrors).length > 0) {
    return { status: "error", errors: mediaErrors, values: echoValues(PROFILE_FIELDS, form) };
  }
  saveProfile(getDb(), parsed.values);
  revalidatePath("/admin", "layout");
  return { status: "saved", errors: {}, values: toFormValues(PROFILE_FIELDS, parsed.values) };
}
