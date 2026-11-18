/**
 * Images are uploaded where they are used: each image field in a form carries an optional file
 * (`<field>__file`) and the alt text of its image (`<field>__alt`) next to its picker. These run inside the
 * editor's save actions, after the other fields have passed, so a refused form never stores a stray upload.
 */
import type { Db } from "@/db/client";
import { media } from "@/db/schema";
import { uploadsDir } from "@/lib/env";
import { eq } from "drizzle-orm";
import { LONG_DASH, LONG_DASH_ERROR, type Field } from "./fields";
import { createMedia, deleteMedia, mediaUsage, processUpload, updateAlt, UploadError } from "./media";

export const FILE_SUFFIX = "__file";
export const ALT_SUFFIX = "__alt";

function altProblem(alt: string): string | null {
  if (LONG_DASH.test(alt)) return LONG_DASH_ERROR;
  if (alt.length > 300) return "Keep the alt text under 300 characters.";
  return null;
}

/**
 * Stores each new file and points its field at it, and saves edited alt text on picked images. Returns the ids it
 * created (so a failed save can drop them) and any errors, keyed by field name.
 */
export async function applyImages(
  db: Db, fields: readonly Field[], form: FormData, values: Record<string, unknown>,
): Promise<{ created: number[]; errors: Record<string, string> }> {
  const created: number[] = [];
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.kind !== "media") continue;
    const file = form.get(f.name + FILE_SUFFIX);
    const rawAlt = form.get(f.name + ALT_SUFFIX);
    const alt = typeof rawAlt === "string" ? rawAlt.trim() : null;
    const problem = alt === null ? null : altProblem(alt);
    if (problem) { errors[f.name] = problem; continue; }
    if (file instanceof File && file.size > 0) {
      try {
        const upload = await processUpload(Buffer.from(await file.arrayBuffer()), f.mediaKind ?? "photo", uploadsDir());
        const { id, existed } = createMedia(db, upload, {
          kind: f.mediaKind ?? "photo",
          alt: alt ?? "",
          provenance: `Uploaded in the editor on ${new Date().toISOString().slice(0, 10)}.`,
        });
        if (existed && alt) updateAlt(db, id, alt);
        if (!existed) created.push(id);
        values[f.name] = id;
      } catch (e) {
        if (e instanceof UploadError) { errors[f.name] = e.message; continue; }
        throw e;
      }
    } else if (typeof values[f.name] === "number" && alt !== null) {
      const id = values[f.name] as number;
      const row = db.select({ alt: media.alt }).from(media).where(eq(media.id, id)).get();
      if (row && row.alt !== alt) updateAlt(db, id, alt);
    }
  }
  return { created, errors };
}

/** Deletes the images among `ids` that nothing uses any more, files and resized copies included. */
export async function dropUnused(db: Db, ids: Iterable<unknown>): Promise<void> {
  for (const id of new Set(ids)) {
    if (typeof id !== "number") continue;
    if (mediaUsage(db, id).length === 0) await deleteMedia(db, id, uploadsDir());
  }
}

/** The image ids a row's image fields point at, the article's screenshots included. */
export function imageIds(fields: readonly Field[], row: Record<string, unknown> | undefined | null): unknown[] {
  if (!row) return [];
  return fields.flatMap((f) => {
    if (f.kind === "media") return [row[f.name]];
    if (f.kind === "article") {
      const shots = (row[f.name] as { shots?: { mediaId?: unknown }[] } | null)?.shots;
      return Array.isArray(shots) ? shots.map((s) => s?.mediaId) : [];
    }
    return [];
  });
}
