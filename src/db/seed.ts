import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./client";
import {
  achievements, activities, cvProfileItems, cvProfiles, education, experiences, media, profile, projects, skills,
} from "./schema";
import {
  defaultCvAchievementOrder, seedAchievements, seedActivities, seedEducation, seedExperiences, seedMedia,
  seedProfile, seedProjects, seedSkills,
} from "./seed-data";

export function resetContent(db: Db): void {
  db.transaction((tx) => {
    tx.delete(cvProfileItems).run();
    tx.delete(cvProfiles).run();
    tx.delete(projects).run();
    tx.delete(achievements).run();
    tx.delete(activities).run();
    tx.delete(experiences).run();
    tx.delete(education).run();
    tx.delete(skills).run();
    tx.delete(profile).run();
    tx.delete(media).run();
  });
}

function copyHashed(assetsDir: string, uploadsDir: string, file: string): string {
  const buf = fs.readFileSync(path.join(assetsDir, file));
  const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const ext = path.extname(file);
  const rel = `${path.dirname(file)}/${path.basename(file, ext)}-${hash}${ext}`;
  fs.mkdirSync(path.join(uploadsDir, path.dirname(file)), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, rel), buf);
  return rel;
}

export function seed(db: Db, opts: { assetsDir: string; uploadsDir: string }): void {
  const mediaIds = new Map<string, number>();
  for (const m of seedMedia) {
    const rel = copyHashed(opts.assetsDir, opts.uploadsDir, m.file);
    const row = db
      .insert(media)
      .values({ path: rel, kind: m.kind, width: m.width, height: m.height, alt: m.alt, provenance: m.provenance })
      .returning({ id: media.id })
      .get();
    mediaIds.set(m.key, row.id);
  }
  const mediaId = (key: string) => {
    const id = mediaIds.get(key);
    if (id === undefined) throw new Error(`Unknown seed media key: ${key}`);
    return id;
  };

  db.transaction((tx) => {
    tx.insert(profile)
      .values({ id: 1, ...seedProfile, photoId: mediaId("owner-badge"), cvPhotoId: mediaId("owner-cutout") })
      .run();

    seedProjects.forEach((p, i) => {
      const { screenshot, ...rest } = p;
      tx.insert(projects)
        .values({ ...rest, sortOrder: i + 1, featured: true, metricIsSample: true, screenshotId: mediaId(screenshot) })
        .run();
    });

    const achievementIds = new Map<string, number>();
    seedAchievements.forEach((a, i) => {
      const row = tx.insert(achievements).values({ ...a, sortOrder: i + 1 }).returning({ id: achievements.id }).get();
      achievementIds.set(a.title, row.id);
    });

    seedActivities.forEach((a, i) => {
      const { photo, ...rest } = a;
      tx.insert(activities).values({ ...rest, sortOrder: i + 1, photoId: mediaId(photo) }).run();
    });

    seedExperiences.forEach((e, i) => tx.insert(experiences).values({ ...e, sortOrder: i + 1 }).run());
    seedEducation.forEach((e, i) => tx.insert(education).values({ ...e, sortOrder: i + 1 }).run());
    seedSkills.forEach((s, i) => tx.insert(skills).values({ ...s, sortOrder: i + 1 }).run());

    const def = tx
      .insert(cvProfiles)
      .values({ slug: "default", name: "Default", isDefault: true })
      .returning({ id: cvProfiles.id })
      .get();
    defaultCvAchievementOrder.forEach((title, i) => {
      const itemId = achievementIds.get(title);
      if (itemId === undefined) throw new Error(`Unknown achievement in CV order: ${title}`);
      tx.insert(cvProfileItems).values({ profileId: def.id, itemType: "achievement", itemId, sortOrder: i }).run();
    });
  });
}
