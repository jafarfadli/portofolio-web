import type { CSSProperties, ReactNode } from "react";

export function SectionHead({ id, title, lead, style, after }: { id: string; title: string; lead?: string; style?: CSSProperties; after?: ReactNode }) {
  return (
    <div className="section-head" style={style}>
      <span className="clip-mark" aria-hidden="true" />
      <h2 id={id}>{title}{after ? <> {after}</> : null}</h2>
      {lead ? <p>{lead}</p> : null}
    </div>
  );
}
