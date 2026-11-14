import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { role } from "@/lib/role";

export const dynamic = "force-dynamic";

/** For launchd checks and the e2e harness: the role, and whether the database answers. */
export function GET() {
  try {
    getDb().run(sql`select 1`);
    return Response.json({ ok: true, role: role() });
  } catch {
    return Response.json({ ok: false, role: role() }, { status: 503 });
  }
}
