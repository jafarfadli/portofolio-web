import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { dataDir, uploadsDir } from "@/lib/env";

describe("env", () => {
  const original = process.env.DATA_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = original;
  });

  it("defaults DATA_DIR to ./.data", () => {
    delete process.env.DATA_DIR;
    expect(dataDir()).toBe(path.resolve(".data"));
    expect(uploadsDir()).toBe(path.resolve(".data", "uploads"));
  });

  it("uses DATA_DIR when set", () => {
    process.env.DATA_DIR = "/tmp/portfolio-data";
    expect(dataDir()).toBe("/tmp/portfolio-data");
    expect(uploadsDir()).toBe("/tmp/portfolio-data/uploads");
  });
});
