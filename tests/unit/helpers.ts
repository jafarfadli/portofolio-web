import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateDb, openDb, type Db } from "@/db/client";
import { seed } from "@/db/seed";

/** Fresh in-memory database with every migration applied. */
export function testDb(): Db {
  return migrateDb(openDb(":memory:"));
}

/** testDb() plus the mockup's sample content (media copied into a throwaway uploads folder). */
export function seededDb(): Db {
  const db = testDb();
  seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: fs.mkdtempSync(path.join(os.tmpdir(), "up-")) });
  return db;
}

/** The smallest valid `projects` row. Spread and override what a test cares about. */
export function minimalProject(slug: string) {
  return {
    slug, name: slug, headline: `**${slug}** does x`, period: "2025", roleLine: "solo", tags: ["Go"],
    fieldColor: "#000000", stickerCaption: "c", layout: "wide" as const, metricValue: "1", metricLabel: "x",
    cvTitle: "t", cvLine: "l",
    cardArt: {
      print: { left: 1, top: 2, width: 3, height: 4, rot: 0 },
      leader: { d: "M 0 0", dot: { x: 0, y: 0 } },
      pin: { x: 1, y: 1, side: "l" as const },
    },
  };
}
