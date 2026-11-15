import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Code under test reads DATA_DIR at call time, and its default is the real ./.data. Unit tests must never touch it:
// the editor's save actions delete images nothing uses, and seeded file names match the live ones. Every test file
// therefore starts with its own throwaway data folder; tests about DATA_DIR itself set or unset it themselves.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-unit-"));
