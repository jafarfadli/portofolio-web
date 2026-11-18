import path from "node:path";
import { dbFile, openDb } from "../db/client";
import { importArticle } from "./import";

const args = process.argv.slice(2);
const slugAt = args.indexOf("--slug");
const slug = slugAt === -1 ? undefined : args[slugAt + 1];
const repo = args.find((a, i) => !a.startsWith("--") && (slugAt === -1 || i !== slugAt + 1));
if (!repo || (slugAt !== -1 && (!slug || slug.startsWith("--")))) {
  console.error("Usage: pnpm article:import <repo folder> [--slug <slug>]");
  process.exit(2);
}

async function main(dir: string): Promise<void> {
  const db = openDb(dbFile(), { mustExist: true });
  const r = await importArticle(db, path.resolve(dir), { slug });
  if (!r.ok) {
    console.error(`Nothing was imported:\n${r.problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  const shots = `${r.newShots} new screenshot${r.newShots === 1 ? "" : "s"}`;
  console.log(
    `Imported the ${r.slug} article (${shots}). ${r.replaced ? "It replaced the one before." : "It is new."} ` +
      (r.published ? "It is published, so the change is live now." : "It is not published yet: check it in the editor, then turn on Publish."),
  );
}

void main(repo);
