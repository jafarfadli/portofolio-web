"use client";

import { useMemo, useState } from "react";
import { setLeaf, textLeaves } from "@/lib/article-leaves";

type A11y = { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/**
 * The article in the project editor: one field per piece of text, and the whole article as JSON under "Structure".
 * Only the JSON box is submitted; the word fields write into it. While the JSON does not parse, the word fields hide.
 */
export function ArticleEditor({ value, a11y, rows, error }: { value: string; a11y: A11y; rows?: number; error?: string }) {
  const [json, setJson] = useState(value);
  const parsed = useMemo<unknown>(() => {
    if (!json.trim()) return null;
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }, [json]);
  const leaves = parsed && typeof parsed === "object" ? textLeaves(parsed) : [];
  const edit = (path: (string | number)[], text: string) => setJson(JSON.stringify(setLeaf(parsed, path, text), null, 2));
  return (
    <div className="adm-article">
      {parsed === undefined ? <p className="adm-help">The JSON below does not parse, so the word fields are hidden until it is fixed.</p> : null}
      {parsed === null ? <p className="adm-help">No article yet. Import one with pnpm article:import, or paste its JSON below.</p> : null}
      {leaves.length > 0 ? (
        <div className="adm-article-words">
          {leaves.map((l) => {
            const id = `${a11y.id}-${l.key.replace(/[^a-z0-9]+/gi, "-")}`;
            return (
              <div key={l.key} className="adm-field">
                <label htmlFor={id}>{l.label}</label>
                {l.long ? (
                  <textarea id={id} className="adm-input" rows={2} value={l.value} onChange={(e) => edit(l.path, e.target.value)} />
                ) : (
                  <input id={id} className="adm-input" value={l.value} onChange={(e) => edit(l.path, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <details className="adm-more" open={Boolean(error) || parsed === undefined || parsed === null || undefined}>
        <summary>Structure (JSON)</summary>
        <textarea className="adm-input is-code" rows={rows ?? 18} spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} {...a11y} />
      </details>
    </div>
  );
}
