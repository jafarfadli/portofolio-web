"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdminAction } from "@/auth/admin";
import { getDb } from "@/db/client";
import { slugify } from "@/content/derive";
import { getProfile } from "@/content/home";
import { echoValues, parseFields, toFormValues } from "./fields";
import { applyImages, dropUnused, imageIds } from "./images";
import { getResource, PROFILE_FIELDS, type Flag, type Resource } from "./resources";
import { checkMedia, deleteItem, getItem, moveItem, saveItem, saveProfile, setFlag } from "./store";

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
  // An empty slug is made from the name, so a new project needs no address typed by hand.
  if (res.key === "projects" && parsed.values.slug === "") {
    const slug = slugify(String(parsed.values.name ?? ""));
    if (!slug) return { status: "error", errors: { slug: "Type a slug: the name has no letters or numbers to make one from." }, values: echoValues(res.fields, form) };
    parsed.values.slug = slug;
  }
  const db = getDb();
  const before = rowId === null ? [] : imageIds(res.fields, getItem(db, res.key, rowId));
  const images = await applyImages(db, res.fields, form, parsed.values);
  if (Object.keys(images.errors).length > 0) {
    await dropUnused(db, images.created);
    return { status: "error", errors: images.errors, values: echoValues(res.fields, form) };
  }
  const result = saveItem(db, res.key, rowId, parsed.values);
  if (!result.ok) {
    await dropUnused(db, images.created);
    return { status: "error", errors: result.errors, message: result.errors._form, values: echoValues(res.fields, form) };
  }
  // An image this item no longer shows, and nothing else uses, goes with its files.
  await dropUnused(db, before);
  revalidatePath(`/admin/${res.key}`);
  if (rowId === null) redirect(`/admin/${res.key}/${result.id}?saved=1`);
  return { status: "saved", errors: {}, values: toFormValues(res.fields, parsed.values) };
}

export async function deleteResource(key: string, id: number): Promise<void> {
  await assertAdminAction();
  const res = resourceFor(key);
  const db = getDb();
  const rowId = idFrom(id);
  const before = imageIds(res.fields, getItem(db, res.key, rowId));
  deleteItem(db, res.key, rowId);
  await dropUnused(db, before);
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
  const db = getDb();
  const before = imageIds(PROFILE_FIELDS, getProfile(db));
  const images = await applyImages(db, PROFILE_FIELDS, form, parsed.values);
  const mediaErrors = { ...images.errors, ...checkMedia(db, PROFILE_FIELDS, parsed.values) };
  if (Object.keys(mediaErrors).length > 0) {
    await dropUnused(db, images.created);
    return { status: "error", errors: mediaErrors, values: echoValues(PROFILE_FIELDS, form) };
  }
  saveProfile(db, parsed.values);
  await dropUnused(db, before);
  revalidatePath("/admin", "layout");
  return { status: "saved", errors: {}, values: toFormValues(PROFILE_FIELDS, parsed.values) };
}
