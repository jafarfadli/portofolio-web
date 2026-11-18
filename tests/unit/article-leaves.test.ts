import { describe, expect, it } from "vitest";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { setLeaf, textLeaves } from "@/lib/article-leaves";

describe("article words", () => {
  const leaves = textLeaves(LEDGERLY_ARTICLE);
  const label = (l: string) => leaves.find((x) => x.label === l);

  it("lists the words with readable labels, and never ids, places or flags", () => {
    expect(label("Opening question")?.value).toBe(LEDGERLY_ARTICLE.hook);
    expect(label("Problem › Point 2")?.value).toBe(LEDGERLY_ARTICLE.problem.points[1]);
    expect(label("Approach › Decision 1 › Gave up")?.value).toBe("a customer portal with order history.");
    expect(label("Architecture › Part 3 (dash) › Tech")?.value).toBe("Next.js");
    expect(label("Architecture › Wire 1 (owner>dash) › Label")?.value).toBe("HTTPS");
    expect(label("Architecture › Scenario 2 › Step 3 › Text")?.value).toMatch(/never sends a reminder twice/);
    expect(label("Results › Number 1 › Source")?.long).toBe(true);
    expect(leaves.some((l) => /\b(Id|Zone|Row|Kind|From|To|At|Sample)\b/.test(l.label))).toBe(false);
  });

  it("lists a screenshot's alt text and caption as long words", () => {
    const withShot = { ...LEDGERLY_ARTICLE, shots: [{ mediaId: 4, alt: "The ledger.", caption: "Open invoices." }] };
    const shot = textLeaves(withShot).filter((l) => l.label.startsWith("Screenshot 1"));
    expect(shot.map((l) => [l.label, l.value, l.long])).toEqual([
      ["Screenshot 1 › Alt text", "The ledger.", true],
      ["Screenshot 1 › Caption", "Open invoices.", true],
    ]);
  });

  it("sets one word without touching the rest", () => {
    const leaf = label("Problem › Point 2")!;
    const next = setLeaf(LEDGERLY_ARTICLE, leaf.path, "Changed.");
    expect(next.problem.points[1]).toBe("Changed.");
    expect(LEDGERLY_ARTICLE.problem.points[1]).not.toBe("Changed.");
    expect(next.architecture).toEqual(LEDGERLY_ARTICLE.architecture);
  });
});
