import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/env";
import { MEDIA_TYPES, safeJoin } from "@/lib/safe-path";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const file = safeJoin(uploadsDir(), segments);
  if (!file) return notFound();
  const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
  if (!type) return notFound();
  try {
    const body = await fs.readFile(/*turbopackIgnore: true*/ file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
