import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { mediaUrl } from "@/content/home";
import { media } from "@/db/schema";
import type { MediaKind } from "./fields";

export type MediaOption = { id: number; label: string; thumb: string; full: string; width: number; height: number };
export type MediaOptions = Record<MediaKind, MediaOption[]>;

/** Picker options per kind, newest first, labelled by alt text (or the file path when alt is empty). */
export function mediaOptions(db: Db): MediaOptions {
  const out: MediaOptions = { screenshot: [], photo: [], logo: [] };
  for (const m of db.select().from(media).orderBy(desc(media.id)).all()) {
    const small = m.variants.find((v) => v.width === 480) ?? m;
    out[m.kind].push({
      id: m.id, label: m.alt || m.path, thumb: mediaUrl(small.path), full: mediaUrl(m.path), width: m.width, height: m.height,
    });
  }
  return out;
}
