"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { edgeId } from "@/lib/edge-id";
import type { Architecture } from "@/lib/article";

type Wire = { id: string; d: string; lx: number; ly: number; label: string };

/** The grid's gaps in px; article.css sets the same on .arch-map. Wires run only in these gaps, never over a part. */
const COL_GAP = 64;
const ROW_GAP = 52;
const NARROW = "(max-width: 860px)";

/**
 * The architecture: zones as stitched columns, parts as printed labels, wires that say what runs on them, and
 * scenarios whose steps light their path (the spec, section 4). The first step of the first scenario is on at load;
 * pressing the lit step turns it off. Hovering or focusing a part lights it and its wires.
 */
export function ArchDiagram({ arch }: { arch: Architecture }) {
  const map = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const [wires, setWires] = useState<Wire[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [flow, setFlow] = useState(0);
  const [step, setStep] = useState<number | null>(0);
  const [hover, setHover] = useState<string | null>(null);

  const measure = useCallback(() => {
    const el = map.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    const narrow = window.matchMedia(NARROW).matches;
    const place = new Map(arch.nodes.map((n) => [n.id, n]));
    // the top of the highest part in a grid row: a lane for a long wire sits in the gap above that row
    const rowTops = new Map<number, number>();
    for (const n of arch.nodes) {
      const t = el.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!.getBoundingClientRect().top - r.top;
      rowTops.set(n.row, Math.min(rowTops.get(n.row) ?? t, t));
    }
    const rowTop = (row: number) => rowTops.get(row)!;
    const box = (id: string) => {
      const b = el.querySelector<HTMLElement>(`[data-node="${id}"]`)!.getBoundingClientRect();
      return {
        l: b.left - r.left, r: b.right - r.left, t: b.top - r.top, b: b.bottom - r.top,
        cx: (b.left + b.right) / 2 - r.left, cy: (b.top + b.bottom) / 2 - r.top,
      };
    };
    setWires(arch.edges.map((e) => {
      const a = box(e.from);
      const b = box(e.to);
      const id = edgeId(e);
      const label = e.label;
      if (narrow) {
        // stacked: out of the left side, down the margin, into the other part's left side
        const x = Math.min(a.l, b.l) - 14;
        return { id, d: `M${a.l},${a.cy} H${x} V${b.cy} H${b.l}`, lx: x, ly: (a.cy + b.cy) / 2, label };
      }
      const pa = place.get(e.from)!;
      const pb = place.get(e.to)!;
      const span = Math.abs(pa.zone - pb.zone);
      if (span === 0) {
        if (Math.abs(pa.row - pb.row) === 1) {
          const down = b.cy > a.cy;
          const y1 = down ? a.b : a.t;
          const y2 = down ? b.t : b.b;
          return { id, d: `M${a.cx},${y1} V${y2}`, lx: a.cx, ly: (y1 + y2) / 2, label };
        }
        // the same zone with a part between: round it through the gutter on the right
        const g = a.r + COL_GAP / 2;
        return { id, d: `M${a.r},${a.cy} H${g} V${b.cy} H${b.r}`, lx: g, ly: (a.cy + b.cy) / 2, label };
      }
      const right = b.cx > a.cx;
      const x1 = right ? a.r : a.l;
      const x2 = right ? b.l : b.r;
      if (span === 1) {
        const mx = (x1 + x2) / 2;
        return { id, d: `M${x1},${a.cy} H${mx} V${b.cy} H${x2}`, lx: mx, ly: (a.cy + b.cy) / 2, label };
      }
      // over more than one zone: out into the gutter beside its part, along the row gap above the higher part's grid row, and
      // down the gutter beside the far part
      const g1 = right ? a.r + COL_GAP / 2 : a.l - COL_GAP / 2;
      const g2 = right ? b.l - COL_GAP / 2 : b.r + COL_GAP / 2;
      const lane = rowTop(Math.min(pa.row, pb.row)) - ROW_GAP / 2;
      return { id, d: `M${x1},${a.cy} H${g1} V${lane} H${g2} V${b.cy} H${x2}`, lx: (g1 + g2) / 2, ly: lane, label };
    }));
  }, [arch]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const el = map.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);

  const steps = arch.flows[flow].steps;
  const lit = new Set<string>(step === null ? [] : steps[step].at);
  if (hover) {
    lit.add(hover);
    for (const e of arch.edges) {
      if (e.from === hover || e.to === hover) { lit.add(edgeId(e)); lit.add(e.from); lit.add(e.to); }
    }
  }
  const pick = (i: number) => { setFlow(i); setStep(0); tabs.current[i]?.focus(); };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = arch.flows.length;
    const to = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (to === null) return;
    e.preventDefault();
    pick(to);
  };
  const tone = (id: string) => (lit.size === 0 ? "" : lit.has(id) ? " is-lit" : " is-dim");
  const ordered = [...arch.nodes].sort((a, b) => a.zone - b.zone || a.row - b.row);
  const rows = Math.max(...arch.nodes.map((n) => n.row)) + 1;

  return (
    <div className="arch">
      <div className="arch-map" ref={map} style={{ "--zones": arch.zones.length, "--rows": rows } as CSSProperties}>
        <svg className="arch-wires" width={size.w} height={size.h} aria-hidden="true" focusable="false">
          {wires.map((w) => <path key={w.id} className={tone(w.id).trim() || undefined} d={w.d} />)}
        </svg>
        {wires.map((w) => (
          <span key={w.id} className={`arch-wire-label${tone(w.id)}`} style={{ left: w.lx, top: w.ly }} aria-hidden="true">{w.label}</span>
        ))}
        {arch.zones.map((z, zi) => (
          <div key={zi} className="arch-zone" style={{ gridColumn: zi + 1, order: zi * 10 }}>
            <p className="arch-zone-name">{z}</p>
          </div>
        ))}
        {ordered.map((n) => (
          <div
            key={n.id}
            data-node={n.id}
            role="group"
            aria-label={n.name}
            tabIndex={0}
            className={`arch-node${n.kind ? ` is-${n.kind}` : ""}${tone(n.id)}`}
            style={{ gridColumn: n.zone + 1, gridRow: n.row + 2, order: n.zone * 10 + n.row + 1 }}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n.id)}
            onBlur={() => setHover(null)}
          >
            <b>{n.name}</b>
            <span className="arch-tech">{n.tech}</span>
            <span className="arch-note">{n.note}</span>
          </div>
        ))}
      </div>
      <div className="arch-flows">
        <div className="arch-tabs" role="tablist" aria-label="Scenarios">
          {arch.flows.map((f, i) => (
            <button
              key={i} type="button" role="tab" id={`${uid}-tab-${i}`} aria-selected={i === flow} aria-controls={`${uid}-steps`}
              tabIndex={i === flow ? 0 : -1}
              ref={(el) => { tabs.current[i] = el; }}
              className={i === flow ? "is-on" : undefined}
              onClick={() => pick(i)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>{f.title}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${uid}-steps`} aria-labelledby={`${uid}-tab-${flow}`}>
          <ol className="arch-steps">
            {steps.map((s, i) => (
              <li key={`${flow}-${i}`}>
                <button type="button" aria-pressed={i === step} className={i === step ? "is-on" : undefined} onClick={() => setStep(i === step ? null : i)}>
                  <span className="arch-step-n" aria-hidden="true">{i + 1}</span>
                  <span>{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
