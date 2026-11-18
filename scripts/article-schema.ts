// Writes docs/article-schema.json from the zod schema (src/lib/article.ts), for the project agents' brief.
// Run `pnpm article:schema` after changing the schema; a unit test fails while the two differ.
import fs from "node:fs";
import { z } from "zod";
import { articleFileSchema } from "../src/lib/article";

fs.writeFileSync("docs/article-schema.json", JSON.stringify(z.toJSONSchema(articleFileSchema, { io: "input" }), null, 2) + "\n");
console.log("Wrote docs/article-schema.json");
