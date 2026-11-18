import "server-only";
import type { Db } from "@/db/client";
import { media, projects } from "@/db/schema";
import { DEVICE_SCENES, type DeviceScene } from "@/content/device-scenes";
import type { Article } from "@/lib/article";
import { toMediaRef, type MediaRef, type Project } from "./home";

export type ArticleShot = MediaRef & { caption: string };
/** A project's room: its Blender scene with its screenshots on the screens, or its main screenshot without one. */
export type ArticleRoom = {
  slug: string; name: string; fieldColor: string; scene: DeviceScene | null;
  shots: { shot: MediaRef; i: number }[]; phoneShot: MediaRef | null;
};
export type ArticleView = { room: ArticleRoom; article: Article; tags: string[]; shots: ArticleShot[]; next: ArticleRoom | null };

const live = (p: Project) => p.article !== null && p.articlePublished && p.showOnSite;

/**
 * What /projects/<slug> renders. Null when there is nothing to show the public: no such project, no article, not
 * published, or not on the site. The editor's preview passes draft to see an unpublished article.
 */
export function getArticleView(db: Db, slug: string, opts: { draft?: boolean } = {}): ArticleView | null {
  const all = db.select().from(projects).all().sort((a, b) => a.sortOrder - b.sortOrder);
  const p = all.find((r) => r.slug === slug);
  if (!p?.article || !(opts.draft || live(p))) return null;
  const refs = new Map(db.select().from(media).all().map((m) => [m.id, toMediaRef(m)]));
  const ref = (id: number | null) => (id == null ? null : (refs.get(id) ?? null));
  const room = (r: Project): ArticleRoom => ({
    slug: r.slug, name: r.name, fieldColor: r.fieldColor, scene: DEVICE_SCENES[r.slug] ?? null, phoneShot: ref(r.phoneShotId),
    shots: [r.screenshotId, r.shot2Id, r.shot3Id, r.shot4Id].flatMap((id, i) => {
      const shot = ref(id);
      return shot ? [{ shot, i }] : [];
    }),
  });
  const own = p.article.shots.flatMap((s) => {
    const m = ref(s.mediaId);
    return m ? [{ ...m, alt: s.alt, caption: s.caption }] : [];
  });
  // Without screenshots of its own, the article shows the card's second and third, uncaptioned.
  const fallback = [p.shot2Id, p.shot3Id].flatMap((id) => {
    const m = ref(id);
    return m ? [{ ...m, caption: "" }] : [];
  });
  const published = all.filter(live);
  const at = published.findIndex((r) => r.id === p.id);
  const after = at === -1 ? published : [...published.slice(at + 1), ...published.slice(0, at)];
  const next = after.find((r) => r.id !== p.id) ?? null;
  return { room: room(p), article: p.article, tags: p.tags, shots: own.length > 0 ? own : fallback, next: next ? room(next) : null };
}

/** The editor's preview of a project's article, published or not. */
export function getArticleViewById(db: Db, id: number): ArticleView | null {
  const p = db.select({ id: projects.id, slug: projects.slug }).from(projects).all().find((r) => r.id === id);
  return p ? getArticleView(db, p.slug, { draft: true }) : null;
}
