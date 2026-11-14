import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET } from "@/app/media/[...path]/route";

const call = (segs: string[]) => GET(new Request("http://x/media"), { params: Promise.resolve({ path: segs }) });

beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "data-"));
  fs.mkdirSync(path.join(dir, "uploads", "screens"), { recursive: true });
  fs.writeFileSync(path.join(dir, "uploads", "screens", "a-0123456789.png"), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(dir, "uploads", "notes.txt"), "secret");
  process.env.DATA_DIR = dir;
});

describe("GET /media/[...path]", () => {
  it("serves an upload with immutable caching", async () => {
    const res = await call(["screens", "a-0123456789.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it.each([[["..", "..", "etc", "passwd"]], [["notes.txt"]], [["screens", "missing.png"]], [["../uploads/notes.txt"]]])(
    "returns 404 for %j",
    async (segs) => {
      expect((await call(segs as string[])).status).toBe(404);
    },
  );
});
