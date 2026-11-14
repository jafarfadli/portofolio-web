import path from "node:path";

/** Join URL path segments under root. Returns null for anything that could escape or is malformed. */
export function safeJoin(root: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (s === "" || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0")) return null;
  }
  const base = path.resolve(root);
  const full = path.resolve(base, ...segments);
  return full.startsWith(base + path.sep) ? full : null;
}

export const MEDIA_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
