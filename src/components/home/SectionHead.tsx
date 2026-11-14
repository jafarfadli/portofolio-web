import type { CSSProperties } from "react";

export function SectionHead({ id, title, lead, style }: { id: string; title: string; lead?: string; style?: CSSProperties }) {
  return (
    <div className="section-head" style={style}>
      <span className="clip-mark" aria-hidden="true" />
      <h2 id={id}>{title}</h2>
      {lead ? <p>{lead}</p> : null}
    </div>
  );
}
