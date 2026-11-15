import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cvProfileItems, media, profile, projects } from "@/db/schema";
import type { Field } from "./fields";
import { RESOURCES, type Flag, type ListKey, type Resource } from "./resources";

export const MAX_FEATURED = 4;
export type Row = Record<string, unknown> & { id: number; sortOrder: number };
export type SaveResult = { ok: true; id: number } | { ok: false; errors: Record<string, string> };
export type FlagResult = { ok: true } | { ok: false; error: "unknown-flag" | "featured-cap" };

// Drizzle's builders are typed per table. Every list table shares listCols() (src/db/schema.ts) and the registry
// names only real columns (tests/unit/store.test.ts checks this), so the builders use one representative table type.
const tableOf = (key: ListKey) => RESOURCES[key].table as unknown as typeof projects;

export function listItems(db: Db, key: ListKey): Row[] {
  const t = tableOf(key);
  return db.select().from(t).orderBy(asc(t.sortOrder), asc(t.id)).all() as Row[];
}

export function getItem(db: Db, key: ListKey, id: number): Row | undefined {
  const t = tableOf(key);
  return db.select().from(t).where(eq(t.id, id)).get() as Row | undefined;
}

export function saveItem(db: Db, key: ListKey, id: number | null, values: Record<string, unknown>): SaveResult {
  const res = RESOURCES[key];
  const errors = checkRules(db, res, id, values);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const t = tableOf(key);
  if (id === null) {
    const { max } = db.select({ max: sql<number>`coalesce(max(${t.sortOrder}), 0)` }).from(t).get()!;
    const row = db
      .insert(t)
      .values({ ...res.hidden, ...values, sortOrder: max + 1 } as never)
      .returning({ id: t.id })
      .get();
    return { ok: true, id: row.id };
  }
  const result = db.update(t).set({ ...values, updatedAt: new Date() } as never).where(eq(t.id, id)).run();
  if (result.changes === 0) return { ok: false, errors: { _form: "This item no longer exists." } };
  return { ok: true, id };
}

/** Also drops the item from every CV profile: cv_profile_items has no foreign key to the six list tables. */
export function deleteItem(db: Db, key: ListKey, id: number): void {
  const t = tableOf(key);
  db.transaction((tx) => {
    tx.delete(cvProfileItems)
      .where(and(eq(cvProfileItems.itemType, RESOURCES[key].cvItemType), eq(cvProfileItems.itemId, id)))
      .run();
    tx.delete(t).where(eq(t.id, id)).run();
  });
}

/** Swap with the neighbour above (-1) or below (1), then renumber 1..n so old gaps and ties disappear. */
export function moveItem(db: Db, key: ListKey, id: number, dir: -1 | 1): boolean {
  const rows = listItems(db, key);
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return false;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  const t = tableOf(key);
  db.transaction((tx) => {
    rows.forEach((r, n) => {
      tx.update(t).set({ sortOrder: n + 1 } as never).where(eq(t.id, r.id)).run();
    });
  });
  return true;
}

export function setFlag(db: Db, key: ListKey, id: number, flag: Flag, value: boolean): FlagResult {
  if (!RESOURCES[key].flags.includes(flag)) return { ok: false, error: "unknown-flag" };
  if (flag === "featured" && value && featuredOthers(db, id) >= MAX_FEATURED) return { ok: false, error: "featured-cap" };
  const t = tableOf(key);
  db.update(t).set({ [flag]: value, updatedAt: new Date() } as never).where(eq(t.id, id)).run();
  return { ok: true };
}

/** The profile is one row with id 1: the first save creates it, later saves update it. */
export function saveProfile(db: Db, values: Record<string, unknown>): void {
  db.insert(profile)
    .values({ id: 1, ...values } as never)
    .onConflictDoUpdate({ target: profile.id, set: { ...values, updatedAt: new Date() } as never })
    .run();
}

function featuredOthers(db: Db, id: number | null): number {
  // drizzle's $count() is awaitable only on this synchronous driver, so count with select().get().
  const where = id === null ? eq(projects.featured, true) : and(eq(projects.featured, true), ne(projects.id, id));
  return db.select({ n: count() }).from(projects).where(where).get()?.n ?? 0;
}

/** A picked image must still exist. Any image may go in any image field. Shared by every list and the profile. */
export function checkMedia(db: Db, fields: readonly Field[], values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.kind !== "media" || !(f.name in values) || values[f.name] === null) continue;
    const picked = db.select({ id: media.id }).from(media).where(eq(media.id, values[f.name] as number)).get();
    if (!picked) errors[f.name] = "That image is gone. Upload it again or pick another.";
  }
  return errors;
}

function checkRules(db: Db, res: Resource, id: number | null, values: Record<string, unknown>): Record<string, string> {
  const errors = checkMedia(db, res.fields, values);
  if (res.key === "projects") {
    if (typeof values.slug === "string") {
      const sameSlug = eq(projects.slug, values.slug);
      const clash = db
        .select({ id: projects.id })
        .from(projects)
        .where(id === null ? sameSlug : and(sameSlug, ne(projects.id, id)))
        .get();
      if (clash) errors.slug = "Another project already uses this slug.";
    }
    if (values.featured === true && featuredOthers(db, id) >= MAX_FEATURED) {
      errors.featured = `Only ${MAX_FEATURED} projects can be featured. Unfeature another one first.`;
    }
  }
  return errors;
}
