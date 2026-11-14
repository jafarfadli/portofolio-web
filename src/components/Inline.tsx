import { Fragment } from "react";
import { IconSticker } from "@/components/IconSticker";
import { parseInline } from "@/lib/inline";

const ROTATIONS = [-7, 5, -4, 6, -5, 7];

/**
 * Owner copy with **strong** and _em_. With `icons`, also `:name:` icon stickers (the CV never passes it).
 * Each sticker takes the next tilt in turn; `tiltFrom` starts the turn further on, so copy set as several runs
 * (the statement, one run per line) keeps turning across them instead of restarting at each.
 */
export function Inline({ text, icons, tiltFrom = 0 }: { text: string; icons?: boolean; tiltFrom?: number }) {
  let n = tiltFrom;
  return (
    <>
      {parseInline(text, { icons }).map((s, i) => {
        if ("icon" in s) return <IconSticker key={i} name={s.icon} rot={ROTATIONS[n++ % ROTATIONS.length]} />;
        return s.strong ? <strong key={i}>{s.text}</strong> : s.em ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>;
      })}
    </>
  );
}
