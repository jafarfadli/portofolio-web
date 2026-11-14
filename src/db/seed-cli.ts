import path from "node:path";
import { dataDir, uploadsDir } from "../lib/env";
import { openDb } from "./client";
import { profile } from "./schema";
import { resetContent, seed } from "./seed";

const force = process.argv.includes("--force");
const db = openDb(path.join(dataDir(), "portfolio.db"));

if (db.select().from(profile).get() && !force) {
  console.error("The database already has content. Re-run with --force to wipe it and reseed.");
  process.exit(1);
}

resetContent(db);
seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: uploadsDir() });
console.log(`Seeded sample content into ${dataDir()}`);
