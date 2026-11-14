import path from "node:path";

/** Absolute data directory: DATA_DIR, or ./.data in development. Read at call time. */
export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? ".data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}
