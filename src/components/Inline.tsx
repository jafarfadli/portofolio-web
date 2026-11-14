import { Fragment } from "react";
import { parseInline } from "@/lib/inline";

export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) =>
        s.strong ? <strong key={i}>{s.text}</strong> : s.em ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>,
      )}
    </>
  );
}
