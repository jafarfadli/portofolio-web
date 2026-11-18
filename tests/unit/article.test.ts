import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { articleFileSchema, checkArticle, checkArticleFile, edgeId, formatPath, type Article } from "@/lib/article";

const copy = (): Article => structuredClone(LEDGERLY_ARTICLE);
const problems = (input: unknown) => {
  const r = checkArticle(input);
  return r.ok ? [] : r.problems;
};

describe("article schema", () => {
  it("accepts the Ledgerly example as it is", () => {
    const r = checkArticle(LEDGERLY_ARTICLE);
    expect(r.ok ? [] : r.problems).toEqual([]);
    if (r.ok) expect(r.value).toEqual(LEDGERLY_ARTICLE);
  });

  it("refuses a number without a source", () => {
    const a = copy();
    a.results.stats[0].source = "  ";
    expect(problems(a)).toContain("results.stats[0].source: Fill this in.");
  });

  it("refuses a wire to a part that does not exist", () => {
    const a = copy();
    a.architecture.edges[0].to = "nowhere";
    expect(problems(a)).toContain('architecture.edges[0].to: No part has the id "nowhere".');
  });

  it("refuses a step that names neither a part nor a wire", () => {
    const a = copy();
    a.architecture.flows[0].steps[0].at = ["ghost"];
    expect(problems(a)).toContain('architecture.flows[0].steps[0].at[0]: "ghost" is not a part id or a wire like "from>to".');
  });

  it("refuses two parts in the same zone and row", () => {
    const a = copy();
    const [first] = a.architecture.nodes;
    a.architecture.nodes[1] = { ...a.architecture.nodes[1], zone: first.zone, row: first.row };
    expect(problems(a)).toContain(`architecture.nodes[1].row: Another part already sits in zone ${first.zone}, row ${first.row}.`);
  });

  it("refuses a part in a zone that does not exist", () => {
    const a = copy();
    a.architecture.nodes[0].zone = 3;
    a.architecture.zones = a.architecture.zones.slice(0, 3);
    expect(problems(a).some((p) => p.startsWith("architecture.nodes[0].zone: There are only 3 zones"))).toBe(true);
  });

  it("refuses over-long text and long dashes", () => {
    const a = copy();
    a.hook = "x".repeat(141);
    a.problem.say = "Slow — and late.";
    const p = problems(a);
    expect(p).toContain("hook: Keep it under 140 characters.");
    expect(p).toContain("problem.say: Use a comma, colon or full stop instead of a long dash.");
  });

  it("refuses keys it does not know", () => {
    expect(problems({ ...copy(), extra: 1 }).some((p) => p.includes("extra"))).toBe(true);
  });

  it("checks the file form: version, slug and screenshot paths", () => {
    const body = copy();
    const ok = checkArticleFile({ version: 1, slug: "ledgerly", ...body, shots: [{ file: "portfolio-article/pay.png", alt: "The pay page", caption: "The pay page." }] });
    expect(ok.ok ? [] : ok.problems).toEqual([]);
    const bad = checkArticleFile({ version: 1, slug: "ledgerly", ...body, shots: [{ file: "../secret.png", alt: "x", caption: "x" }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems[0]).toMatch(/^shots\[0\]\.file: /);
  });

  it("names wires and paths the same way everywhere", () => {
    expect(edgeId({ from: "api", to: "db" })).toBe("api>db");
    expect(formatPath(["a", 0, "b"])).toBe("a[0].b");
    expect(formatPath([])).toBe("(the file)");
  });
});

describe("the brief's files", () => {
  it("the Clinky example is a valid article file", () => {
    const r = checkArticleFile(JSON.parse(fs.readFileSync("docs/article-example.clinky.json", "utf8")));
    expect(r.ok ? [] : r.problems).toEqual([]);
  });
  it("the committed JSON Schema matches the zod schema", () => {
    const now = JSON.stringify(z.toJSONSchema(articleFileSchema, { io: "input" }), null, 2) + "\n";
    expect(fs.readFileSync("docs/article-schema.json", "utf8")).toBe(now);
  });
});
