import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { mediaUrl } from "@/content/home";
import { media } from "@/db/schema";

export type MediaOption = { id: number; label: string; alt: string; thumb: string; full: string; width: number; height: number };
export type MediaOptions = MediaOption[];

/** Every image already uploaded, newest first, for reuse in any image field. Labelled by alt text, else the file. */
export function mediaOptions(db: Db): MediaOptions {
  return db.select().from(media).orderBy(desc(media.id)).all().map((m) => {
    const small = m.variants.find((v) => v.width === 480) ?? m;
    return {
      id: m.id, label: m.alt || m.path, alt: m.alt, thumb: mediaUrl(small.path), full: mediaUrl(m.path), width: m.width, height: m.height,
    };
  });
}
