"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdminAction } from "@/auth/admin";
import { getDb } from "@/db/client";
import { uploadsDir } from "@/lib/env";
import { LONG_DASH, LONG_DASH_ERROR, type MediaKind } from "./fields";
import { createMedia, deleteMedia, KIND_DIRS, MAX_UPLOAD_BYTES, processUpload, updateAlt, UploadError } from "./media";

export type MediaFormState = { error?: string; done?: boolean; notice?: string };

function altProblem(alt: string): string | null {
  if (LONG_DASH.test(alt)) return LONG_DASH_ERROR;
  if (alt.length > 300) return "Keep the alt text under 300 characters.";
  return null;
}

function idFrom(id: unknown): number {
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) throw new Error("Bad id");
  return id;
}

export async function uploadMedia(_prev: MediaFormState, form: FormData): Promise<MediaFormState> {
  await assertAdminAction();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const alt = String(form.get("alt") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Files can be up to 15 MB." };
  if (!Object.hasOwn(KIND_DIRS, kind)) return { error: "Pick what kind of image this is." };
  const problem = altProblem(alt);
  if (problem) return { error: problem };
  let existed: boolean;
  try {
    const upload = await processUpload(Buffer.from(await file.arrayBuffer()), kind as MediaKind, uploadsDir());
    ({ existed } = createMedia(getDb(), upload, {
      kind: kind as MediaKind,
      alt,
      provenance: `Uploaded in the editor on ${new Date().toISOString().slice(0, 10)}.`,
    }));
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath("/admin/media");
  if (existed) return { done: true, notice: "That image is already in the library. Edit its alt text below." };
  return { done: true };
}

export async function saveAlt(id: number, _prev: MediaFormState, form: FormData): Promise<MediaFormState> {
  await assertAdminAction();
  const alt = String(form.get("alt") ?? "").trim();
  const problem = altProblem(alt);
  if (problem) return { error: problem };
  updateAlt(getDb(), idFrom(id), alt);
  revalidatePath("/admin/media");
  return { done: true };
}

export async function removeMedia(id: number): Promise<void> {
  await assertAdminAction();
  const result = await deleteMedia(getDb(), idFrom(id), uploadsDir());
  revalidatePath("/admin/media");
  redirect(result.ok ? "/admin/media?notice=deleted" : "/admin/media?notice=in-use");
}
