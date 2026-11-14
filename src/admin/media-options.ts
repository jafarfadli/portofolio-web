import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { media } from "@/db/schema";
import type { MediaKind } from "./fields";

export type MediaOption = { id: number; label: string };
export type MediaOptions = Record<MediaKind, MediaOption[]>;

/** Picker options per kind, newest first, labelled by alt text (or the file path when alt is empty). */
export function mediaOptions(db: Db): MediaOptions {
  const out: MediaOptions = { screenshot: [], photo: [], logo: [] };
  for (const m of db.select().from(media).orderBy(desc(media.id)).all()) {
    out[m.kind].push({ id: m.id, label: m.alt || m.path });
  }
  return out;
}
