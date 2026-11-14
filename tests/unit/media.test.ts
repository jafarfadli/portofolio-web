import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { createMedia, deleteMedia, MAX_UPLOAD_BYTES, mediaUsage, processUpload } from "@/admin/media";
import { toMediaRef } from "@/content/home";
import { media, profile, projects } from "@/db/schema";
import { seededDb } from "./helpers";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#2132d6" } });

describe("processUpload", () => {
  it("re-encodes to WebP under a content-hashed name, strips metadata, and writes smaller variants", async () => {
    const dir = tmp();
    const input = await image(2000, 1200).withMetadata({ exif: { IFD0: { Copyright: "private" } } }).jpeg().toBuffer();
    const out = await processUpload(input, "screenshot", dir);
    expect(out.path).toMatch(/^screens\/[0-9a-f]{12}\.webp$/);
    expect([out.width, out.height]).toEqual([2000, 1200]);
    expect(out.variants.map((v) => v.width)).toEqual([480, 960, 1600]);
    expect(out.variants.every((v) => fs.existsSync(path.join(dir, v.path)))).toBe(true);
    const meta = await sharp(path.join(dir, out.path)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("caps the master at 2400 px and skips variants as wide as the image", async () => {
    const big = await processUpload(await image(3000, 1000).png().toBuffer(), "photo", tmp());
    expect(big.width).toBe(2400);
    expect(big.path).toMatch(/^photos\//);
    const small = await processUpload(await image(600, 400).png().toBuffer(), "logo", tmp());
    expect(small.width).toBe(600);
    expect(small.variants.map((v) => v.width)).toEqual([480]);
  });

  it("rejects empty, oversize and non-image files", async () => {
    const dir = tmp();
    await expect(processUpload(Buffer.alloc(0), "photo", dir)).rejects.toThrow("Choose a file to upload.");
    await expect(processUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1), "photo", dir)).rejects.toThrow("Files can be up to 15 MB.");
    await expect(processUpload(Buffer.from("hello"), "photo", dir)).rejects.toThrow("That file is not an image.");
    const jpeg = await image(800, 600).jpeg().toBuffer();
    await expect(processUpload(jpeg.subarray(0, Math.floor(jpeg.length / 2)), "photo", dir)).rejects.toThrow(
      "That file is not an image.",
    );
    const gif = await image(10, 10).gif().toBuffer();
    await expect(processUpload(gif, "photo", dir)).rejects.toThrow("Upload a JPEG, PNG, WebP or AVIF image.");
  });

  it("accepts AVIF (sharp reports it as heif with av1) and stores a WebP master", async () => {
    const avif = await image(1000, 600).avif().toBuffer();
    const meta = await sharp(avif).metadata();
    expect([meta.format, meta.compression]).toEqual(["heif", "av1"]);
    const dir = tmp();
    const out = await processUpload(avif, "photo", dir);
    expect(out.path).toMatch(/^photos\/[0-9a-f]{12}\.webp$/);
    expect([out.width, out.height]).toEqual([1000, 600]);
    expect((await sharp(path.join(dir, out.path)).metadata()).format).toBe("webp");
  });

  it("keeps refusing HEIC (heif with hevc)", async ({ skip }) => {
    let heic: Buffer;
    try {
      heic = await image(100, 100).heif({ compression: "hevc" }).toBuffer();
    } catch {
      return skip("this sharp build has no HEVC encoder, so there is nothing to feed the check");
    }
    await expect(processUpload(heic, "photo", tmp())).rejects.toThrow("Upload a JPEG, PNG, WebP or AVIF image.");
  });

  it("refuses to write through a symlinked folder", async () => {
    const dir = tmp();
    fs.symlinkSync(tmp(), path.join(dir, "photos"));
    await expect(processUpload(await image(10, 10).png().toBuffer(), "photo", dir)).rejects.toThrow(
      "The uploads folder is not a plain directory.",
    );
  });
});

describe("media rows", () => {
  it("reuses the row for a re-upload, blocks deleting used images, and deletes files otherwise", async () => {
    const db = seededDb();
    const dir = tmp();
    const upload = await processUpload(await image(1200, 800).png().toBuffer(), "screenshot", dir);
    const meta = { kind: "screenshot" as const, alt: "Invoice", provenance: "test" };
    const first = createMedia(db, upload, meta);
    const id = first.id;
    expect(first.existed).toBe(false);
    expect(createMedia(db, upload, meta)).toEqual({ id, existed: true });
    expect(db.select().from(media).where(eq(media.id, id)).get()!.variants).toHaveLength(2);

    db.update(projects).set({ screenshotId: id }).where(eq(projects.slug, "ledgerly")).run();
    expect(mediaUsage(db, id)).toEqual(["Ledgerly"]);
    expect(await deleteMedia(db, id, dir)).toEqual({ ok: false, error: "Used by Ledgerly. Pick another image there first." });

    db.update(projects).set({ screenshotId: null }).where(eq(projects.slug, "ledgerly")).run();
    expect(await deleteMedia(db, id, dir)).toEqual({ ok: true });
    expect(fs.existsSync(path.join(dir, upload.path))).toBe(false);
    expect(fs.existsSync(path.join(dir, upload.variants[0].path))).toBe(false);
  });

  it("reports the profile photos as used by the profile", () => {
    const db = seededDb();
    const p = db.select().from(profile).get()!;
    expect(mediaUsage(db, p.photoId!)).toEqual(["Profile, badge photo"]);
    expect(mediaUsage(db, p.cvPhotoId!)).toEqual(["Profile, CV photo"]);
  });

  it("builds a srcset from the variants, widest last", () => {
    const ref = toMediaRef({
      id: 1, path: "screens/abc.webp", kind: "screenshot", width: 2000, height: 1250, alt: "A", provenance: "p",
      variants: [{ width: 480, height: 300, path: "screens/abc-480.webp" }, { width: 960, height: 600, path: "screens/abc-960.webp" }],
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(ref.srcSet).toBe("/media/screens/abc-480.webp 480w, /media/screens/abc-960.webp 960w, /media/screens/abc.webp 2000w");
    const seeded = toMediaRef({
      id: 2, path: "photos/p.png", kind: "photo", width: 800, height: 600, alt: "", provenance: "seed",
      variants: [], createdAt: new Date(), updatedAt: new Date(),
    });
    expect(seeded).toEqual({ url: "/media/photos/p.png", width: 800, height: 600, alt: "", srcSet: undefined });
  });
});
