/**
 * Phone photos are often 5 to 10 MB, and a form can carry five of them, so each picked image is scaled down in the
 * browser before the form is sent. The server re-encodes every upload anyway (src/admin/media.ts), never wider than
 * this, so nothing it keeps is lost.
 */
const MAX_WIDTH = 2400;
/** Small enough already: sent as picked, so a screenshot keeps its exact pixels. */
const KEEP_UNDER = 2 * 1024 * 1024;

/** Sizes in the editor's own words, like "4.2 MB" or "380 KB". */
export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function load(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  // An <img> applies the photo's EXIF rotation, so a portrait taken on a phone stays upright on the canvas.
  return img.decode().then(() => img).finally(() => URL.revokeObjectURL(url));
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
}

/** The picked file, or a smaller copy of it. Anything the browser cannot read goes up as is, and the server explains. */
export async function shrinkImage(file: File): Promise<File> {
  let img: HTMLImageElement;
  try {
    img = await load(file);
  } catch {
    return file;
  }
  if (file.size <= KEEP_UNDER && img.naturalWidth <= MAX_WIDTH) return file;

  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // WebP keeps transparency (the CV cutout). A browser that cannot write WebP hands back PNG, so JPEG takes over
  // for photos, which have no transparency to keep.
  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, file.type === "image/png" ? "image/png" : "image/jpeg");
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: blob.type, lastModified: file.lastModified });
}
