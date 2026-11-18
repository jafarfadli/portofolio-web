/**
 * Imports the article a project's agent wrote (docs/article-brief.md) into the project with its slug. It reads the
 * repo only. On any problem it stores nothing, and a screenshot it already stored is dropped again. A re-import
 * replaces the article and keeps its published state.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import type { Db } from "@/db/client";
import { projects } from "@/db/schema";
import { createMedia, processUpload, UploadError } from "@/admin/media";
import { dropUnused } from "@/admin/images";
import { checkArticle, checkArticleFile, type Article } from "@/lib/article";
import { uploadsDir } from "@/lib/env";

export const ARTICLE_FILE = "portfolio-article.json";
export const MIN_SHOT_WIDTH = 1440;
/** The keys that exist only in the file form; the stored article has the rest. */
const FILE_ONLY = new Set(["version", "slug", "shots"]);

export type ImportResult =
  | { ok: true; slug: string; newShots: number; replaced: boolean; published: boolean }
  | { ok: false; problems: string[] };

export async function importArticle(db: Db, repoDir: string, opts: { slug?: string; today?: string } = {}): Promise<ImportResult> {
  const root = path.resolve(repoDir);
  let raw: string;
  try {
    const at = path.join(root, ARTICLE_FILE);
    if ((await fs.lstat(at)).isSymbolicLink()) return { ok: false, problems: [`${ARTICLE_FILE} must be a plain file, not a link.`] };
    raw = await fs.readFile(at, "utf8");
  } catch {
    return { ok: false, problems: [`${ARTICLE_FILE} was not found in ${root}.`] };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, problems: [`${ARTICLE_FILE} is not valid JSON: ${(e as Error).message}`] };
  }
  const file = checkArticleFile(json);
  if (!file.ok) return file;
  const slug = opts.slug ?? file.value.slug;
  const row = db.select().from(projects).where(eq(projects.slug, slug)).get();
  if (!row) return { ok: false, problems: [`No project has the slug "${slug}". Add it in the editor first, or pass --slug.`] };

  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const created: number[] = [];
  const shots: Article["shots"] = [];
  const problems: string[] = [];
  const realRoot = await fs.realpath(root);
  for (const [i, s] of file.value.shots.entries()) {
    const at = path.resolve(root, s.file);
    if (!at.startsWith(root + path.sep)) { problems.push(`shots[${i}].file: must stay inside the repo.`); continue; }
    let buf: Buffer;
    try {
      if ((await fs.lstat(at)).isSymbolicLink()) {
        problems.push(`shots[${i}].file: ${s.file} must be a plain file, not a link.`);
        continue;
      }
      const real = await fs.realpath(at);
      if (!real.startsWith(realRoot + path.sep)) {
        problems.push(`shots[${i}].file: ${s.file} must stay inside the repo, without links.`);
        continue;
      }
      buf = await fs.readFile(real);
    } catch {
      problems.push(`shots[${i}].file: ${s.file} was not found.`);
      continue;
    }
    const width = (await sharp(buf).metadata().catch(() => null))?.width;
    if (width === undefined) {
      problems.push(`shots[${i}].file: ${s.file} could not be read as an image.`);
      continue;
    }
    if (width < MIN_SHOT_WIDTH) {
      problems.push(`shots[${i}].file: ${s.file} is ${width}px wide; capture it at least ${MIN_SHOT_WIDTH}px wide.`);
      continue;
    }
    try {
      const upload = await processUpload(buf, "screenshot", uploadsDir());
      const { id, existed } = createMedia(db, upload, { kind: "screenshot", alt: s.alt, provenance: `Imported with the ${slug} article on ${today}.` });
      if (!existed) created.push(id);
      shots.push({ mediaId: id, alt: s.alt, caption: s.caption });
    } catch (e) {
      problems.push(`shots[${i}].file: ${e instanceof UploadError ? e.message : `could not store ${s.file}.`}`);
    }
  }
  if (problems.length > 0) {
    await dropUnused(db, created);
    return { ok: false, problems };
  }

  const body = Object.fromEntries(Object.entries(file.value).filter(([k]) => !FILE_ONLY.has(k)));
  const article = checkArticle({ ...body, shots });
  if (!article.ok) {
    await dropUnused(db, created);
    return article;
  }
  const before = row.article?.shots.map((s) => s.mediaId) ?? [];
  // A reused media row keeps its own alt text: the article carries the alt it needs.
  db.update(projects).set({ article: article.value, updatedAt: new Date() }).where(eq(projects.id, row.id)).run();
  await dropUnused(db, before);
  return { ok: true, slug, newShots: created.length, replaced: row.article !== null, published: row.articlePublished };
}
