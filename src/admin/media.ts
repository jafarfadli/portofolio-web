import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { desc, eq, or } from "drizzle-orm";
import sharp, { type OutputInfo } from "sharp";
import type { Db } from "@/db/client";
import { achievements, activities, media, profile, projects, type MediaVariant } from "@/db/schema";
import { safeJoin } from "@/lib/safe-path";
import type { MediaKind } from "./fields";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const VARIANT_WIDTHS = [480, 960, 1600] as const;
const MASTER_MAX_WIDTH = 2400;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

/** sharp reports AVIF as format "heif" with compression "av1". HEIC (compression "hevc") stays refused. */
function acceptedFormat(meta: { format?: string; compression?: string }): boolean {
  if (meta.format === "heif") return meta.compression === "av1";
  return meta.format !== undefined && ACCEPTED_FORMATS.has(meta.format);
}
export const KIND_DIRS: Record<MediaKind, string> = { screenshot: "screens", photo: "photos", logo: "logos" };

export class UploadError extends Error {}
export type ProcessedUpload = { path: string; width: number; height: number; variants: MediaVariant[] };

/**
 * Validates by decoding (sharp), never by extension or MIME header. Re-encoding to WebP drops EXIF and anything
 * appended to the file. Names come from the content hash, never from the user.
 */
export async function processUpload(input: Buffer, kind: MediaKind, uploadsDir: string): Promise<ProcessedUpload> {
  if (input.byteLength === 0) throw new UploadError("Choose a file to upload.");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("Files can be up to 15 MB.");
  const NOT_AN_IMAGE = "That file is not an image.";
  // Every sharp step can fail on a truncated or corrupt file (metadata only reads the header), so all of them
  // map to one friendly error. Nothing is written until every encode has succeeded.
  let master: { data: Buffer; info: OutputInfo };
  const encoded: { width: number; height: number; data: Buffer }[] = [];
  try {
    if (!acceptedFormat(await sharp(input).metadata())) throw new UploadError("Upload a JPEG, PNG, WebP or AVIF image.");
    master = await sharp(input)
      .rotate()
      .resize({ width: MASTER_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
    for (const width of VARIANT_WIDTHS) {
      if (width >= master.info.width) continue;
      const v = await sharp(master.data).resize({ width }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      encoded.push({ width: v.info.width, height: v.info.height, data: v.data });
    }
  } catch (e) {
    if (e instanceof UploadError) throw e;
    throw new UploadError(NOT_AN_IMAGE);
  }

  const hash = crypto.createHash("sha256").update(master.data).digest("hex").slice(0, 12);
  const dir = KIND_DIRS[kind];
  await ensurePlainDir(path.join(/*turbopackIgnore: true*/ uploadsDir, dir));
  const rel = `${dir}/${hash}.webp`;
  await writeNoFollow(path.join(/*turbopackIgnore: true*/ uploadsDir, rel), master.data);

  const variants: MediaVariant[] = [];
  for (const v of encoded) {
    const vrel = `${dir}/${hash}-${v.width}.webp`;
    await writeNoFollow(path.join(/*turbopackIgnore: true*/ uploadsDir, vrel), v.data);
    variants.push({ width: v.width, height: v.height, path: vrel });
  }
  return { path: rel, width: master.info.width, height: master.info.height, variants };
}

async function ensurePlainDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const stat = await fs.lstat(dir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new UploadError("The uploads folder is not a plain directory.");
}

async function writeNoFollow(file: string, data: Buffer): Promise<void> {
  const { O_WRONLY, O_CREAT, O_TRUNC, O_NOFOLLOW } = fsSync.constants;
  const handle = await fs.open(file, O_WRONLY | O_CREAT | O_TRUNC | O_NOFOLLOW, 0o644);
  try {
    await handle.writeFile(data);
  } finally {
    await handle.close();
  }
}

/** The same image uploaded twice hashes to the same files, so the existing row is reused (its alt text is kept). */
export function createMedia(db: Db, upload: ProcessedUpload, meta: { kind: MediaKind; alt: string; provenance: string }): { id: number; existed: boolean } {
  const existing = db.select({ id: media.id }).from(media).where(eq(media.path, upload.path)).get();
  if (existing) return { id: existing.id, existed: true };
  const id = db
    .insert(media)
    .values({
      path: upload.path, kind: meta.kind, width: upload.width, height: upload.height,
      alt: meta.alt, provenance: meta.provenance, variants: upload.variants,
    })
    .returning({ id: media.id })
    .get().id;
  return { id, existed: false };
}

export function mediaUsage(db: Db, id: number): string[] {
  const owner = db.select({ photoId: profile.photoId, cvPhotoId: profile.cvPhotoId }).from(profile).get();
  return [
    ...(owner?.photoId === id ? ["Profile, badge photo"] : []),
    ...(owner?.cvPhotoId === id ? ["Profile, CV photo"] : []),
    ...db.select({ name: projects.name }).from(projects).where(eq(projects.screenshotId, id)).all().map((r) => r.name),
    ...db.select({ name: projects.name }).from(projects).where(eq(projects.phoneShotId, id)).all().map((r) => `${r.name}, phone`),
    ...db
      .select({ name: projects.name })
      .from(projects)
      .where(or(eq(projects.shot2Id, id), eq(projects.shot3Id, id), eq(projects.shot4Id, id)))
      .all()
      .map((r) => `${r.name}, gallery`),
    ...db
      .select({ name: achievements.title })
      .from(achievements)
      .where(or(eq(achievements.photoId, id), eq(achievements.photo2Id, id), eq(achievements.photo3Id, id), eq(achievements.photo4Id, id)))
      .all()
      .map((r) => r.name),
    ...db.select({ name: activities.title }).from(activities).where(eq(activities.photoId, id)).all().map((r) => r.name),
    ...db
      .select({ name: projects.name, article: projects.article })
      .from(projects)
      .all()
      .filter((r) => r.article?.shots.some((s) => s.mediaId === id))
      .map((r) => `${r.name}, article`),
  ];
}

export function listMedia(db: Db) {
  return db
    .select()
    .from(media)
    .orderBy(desc(media.id))
    .all()
    .map((m) => ({ ...m, usedBy: mediaUsage(db, m.id) }));
}

export function updateAlt(db: Db, id: number, alt: string): void {
  db.update(media).set({ alt, updatedAt: new Date() }).where(eq(media.id, id)).run();
}

export async function deleteMedia(db: Db, id: number, uploadsDir: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = db.select().from(media).where(eq(media.id, id)).get();
  if (!row) return { ok: true };
  const usedBy = mediaUsage(db, id);
  if (usedBy.length > 0) return { ok: false, error: `Used by ${usedBy.join(", ")}. Pick another image there first.` };
  db.delete(media).where(eq(media.id, id)).run();
  for (const rel of [row.path, ...row.variants.map((v) => v.path)]) {
    const file = safeJoin(uploadsDir, rel.split("/"));
    if (file) await fs.rm(file, { force: true });
  }
  return { ok: true };
}
