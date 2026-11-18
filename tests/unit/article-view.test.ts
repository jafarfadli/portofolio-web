import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getArticleView, getArticleViewById } from "@/content/article";
import { getHomeContent } from "@/content/home";
import { projects } from "@/db/schema";
import { seededDb } from "./helpers";

describe("article view", () => {
  it("shows a published article with its room and no next project when it is the only one", () => {
    const db = seededDb();
    const v = getArticleView(db, "ledgerly")!;
    expect(v.room.name).toBe("Ledgerly");
    expect(v.article.hook).toContain("get paid before the week was out");
    expect(v.room.shots.length).toBeGreaterThan(0);
    expect(v.next).toBeNull();
  });

  it("shows the article's own shots, with their own alt and caption, instead of the card's", () => {
    const db = seededDb();
    const p = db.select().from(projects).where(eq(projects.slug, "ledgerly")).get()!;
    const mediaId = p.screenshotId!;
    db.update(projects).set({ article: { ...p.article!, shots: [{ mediaId, alt: "The ledger, grouped by client.", caption: "Open invoices by client." }] } })
      .where(eq(projects.id, p.id)).run();
    const v = getArticleView(db, "ledgerly")!;
    expect(v.shots).toHaveLength(1);
    expect(v.shots[0]).toMatchObject({ alt: "The ledger, grouped by client.", caption: "Open invoices by client." });
    const fallback = getArticleView(seededDb(), "ledgerly")!.shots;
    expect(fallback.every((s) => s.caption === "")).toBe(true);
  });

  it("hides a draft, an unknown slug and a project taken off the site", () => {
    const db = seededDb();
    expect(getArticleView(db, "kanbo")).toBeNull();
    expect(getArticleView(db, "nope")).toBeNull();
    db.update(projects).set({ showOnSite: false }).where(eq(projects.slug, "ledgerly")).run();
    expect(getArticleView(db, "ledgerly")).toBeNull();
  });

  it("shows a draft to the editor's preview", () => {
    const db = seededDb();
    const kanbo = db.select().from(projects).where(eq(projects.slug, "kanbo")).get()!;
    expect(getArticleViewById(db, kanbo.id)?.article.hook).toContain("see each other think");
    expect(getArticleViewById(db, 99999)).toBeNull();
  });

  it("points Next project at the following published article, wrapping round", () => {
    const db = seededDb();
    db.update(projects).set({ articlePublished: true }).where(eq(projects.slug, "kanbo")).run();
    expect(getArticleView(db, "ledgerly")!.next?.slug).toBe("kanbo");
    expect(getArticleView(db, "kanbo")!.next?.slug).toBe("ledgerly");
  });

  it("marks home cards whose article is published", () => {
    const db = seededDb();
    const byslug = Object.fromEntries(getHomeContent(db)!.projects.map((p) => [p.slug, p.hasArticle]));
    expect(byslug).toMatchObject({ ledgerly: true, kanbo: false, rute: false });
  });
});
