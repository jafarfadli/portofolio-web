import { Fragment } from "react";
import { IconSticker } from "@/components/IconSticker";
import { parseInline } from "@/lib/inline";

const ROTATIONS = [-7, 5, -4, 6, -5, 7];

/** Owner copy with **strong** and _em_. With `icons`, also `:name:` icon stickers (the CV never passes it). */
export function Inline({ text, icons }: { text: string; icons?: boolean }) {
  let n = 0;
  return (
    <>
      {parseInline(text, { icons }).map((s, i) => {
        if ("icon" in s) return <IconSticker key={i} name={s.icon} rot={ROTATIONS[n++ % ROTATIONS.length]} />;
        return s.strong ? <strong key={i}>{s.text}</strong> : s.em ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>;
      })}
    </>
  );
}
