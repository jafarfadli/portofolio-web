/**
 * Copies of real page parts for the swarm's duplicates: a deep clone with every element's computed look written inline,
 * so it looks the same outside the page's selectors, laid over the page in the swarm's layer. Pseudo-elements are not
 * copied; a copy is only on screen while it is dragged and then edited.
 */
import { frameStyle, type Box, type Frame } from "./geom";

const TEXT = [
  "color", "font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variation-settings",
  "font-feature-settings", "line-height", "letter-spacing", "word-spacing", "text-transform", "text-align",
  "text-decoration-line", "text-decoration-color", "text-decoration-thickness", "text-underline-offset", "white-space",
  "text-wrap", "overflow-wrap", "word-break", "-webkit-text-fill-color", "-webkit-font-smoothing", "text-shadow",
];
const BOX = [
  "display", "box-sizing", "width", "height", "min-width", "min-height", "max-width", "padding-top", "padding-right",
  "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left", "border-top-width",
  "border-right-width", "border-bottom-width", "border-left-width", "border-top-style", "border-right-style",
  "border-bottom-style", "border-left-style", "border-top-color", "border-right-color", "border-bottom-color",
  "border-left-color", "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius",
  "border-bottom-left-radius", "background-color", "background-image", "background-size", "background-position",
  "background-repeat", "box-shadow", "opacity", "vertical-align", "position", "top", "right", "bottom", "left",
  "z-index", "flex-direction", "flex-wrap", "align-items", "justify-content", "gap", "row-gap", "column-gap",
  "flex-grow", "flex-shrink", "flex-basis", "align-self", "grid-template-columns", "grid-template-rows",
  "grid-area", "place-items", "object-fit", "object-position", "overflow", "transform", "transform-origin", "rotate",
  "translate", "scale", "clip-path", "filter", "list-style-type", "aspect-ratio",
];
const SVG = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "opacity", "color", "width", "height", "display", "vertical-align"];

function styleOf(cs: CSSStyleDeclaration, props: string[]): string {
  let s = "";
  for (const p of props) {
    const v = cs.getPropertyValue(p);
    if (v) s += `${p}:${v};`;
  }
  return s;
}

function copy(src: Element, doc: Document): Element | null {
  const cs = getComputedStyle(src);
  if (cs.display === "none") return null;
  if (src instanceof SVGSVGElement) {
    const svg = src.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("style", styleOf(cs, [...SVG, ...BOX.filter((p) => p.startsWith("margin") || p === "position" || p === "top" || p === "left")]));
    const from = src.querySelectorAll("*");
    svg.querySelectorAll("*").forEach((n, i) => {
      if (from[i]) (n as SVGElement).setAttribute("style", styleOf(getComputedStyle(from[i]), SVG));
    });
    svg.removeAttribute("id");
    return svg;
  }
  const dst = doc.createElement(src instanceof HTMLImageElement ? "img" : "div");
  if (src instanceof HTMLImageElement) {
    (dst as HTMLImageElement).src = src.currentSrc || src.src;
    dst.setAttribute("alt", "");
  }
  // inline elements stay inline (a <b> in a line), blocks keep their display through the copied style
  dst.setAttribute("style", styleOf(cs, [...TEXT, ...BOX]) + "pointer-events:none;");
  for (const n of src.childNodes) {
    if (n.nodeType === 3) dst.appendChild(doc.createTextNode(n.textContent ?? ""));
    else if (n.nodeType === 1) {
      const c = copy(n as Element, doc);
      if (c) dst.appendChild(c);
    }
  }
  return dst;
}

/** A styled copy of `src`, drawn at `frame` (its layout box and transforms), in page coordinates. */
export function ghostOf(src: Element, frame: Frame, sx: number, sy: number): HTMLElement {
  const doc = src.ownerDocument;
  const g = copy(src, doc) as HTMLElement;
  g.classList.add("sw-ghost");
  const st = frameStyle(frame, { x: 0, y: 0, w: frame.w, h: frame.h }, sx, sy);
  g.style.position = "absolute";
  g.style.margin = "0";
  g.style.left = `${st.left}px`;
  g.style.top = `${st.top}px`;
  g.style.right = "auto";
  g.style.bottom = "auto";
  g.style.width = `${frame.w}px`;
  g.style.height = `${frame.h}px`;
  g.style.translate = "none";
  g.style.rotate = "none";
  g.style.scale = "none";
  g.style.transform = "none";
  if (st.css) g.style.cssText += st.css;
  return g;
}

/** A copy of a block of text (`src`, styled) laid at `at`, a page box, wrapping to its width. */
export function textGhostOf(src: Element, at: Box): HTMLElement {
  const g = (copy(src, src.ownerDocument) as HTMLElement | null) ?? src.ownerDocument.createElement("div");
  g.classList.add("sw-ghost");
  Object.assign(g.style, {
    position: "absolute", margin: "0", left: `${at.x}px`, top: `${at.y}px`, right: "auto", bottom: "auto",
    width: `${Math.max(at.w, 1)}px`, height: "auto", minHeight: "0", transform: "none", translate: "none", rotate: "none",
    scale: "none", background: "none", boxShadow: "none", borderColor: "transparent", clipPath: "none", opacity: "1",
  });
  return g;
}

/** A plain run of label text (a tag's or a button's words) in `from`'s type, at a page point. */
export function labelGhostOf(from: Element, text: string, at: Box): HTMLElement {
  const doc = from.ownerDocument;
  const g = doc.createElement("div");
  g.className = "sw-ghost";
  g.setAttribute("style", styleOf(getComputedStyle(from), TEXT) + "position:absolute;margin:0;white-space:nowrap;pointer-events:none;");
  g.style.left = `${at.x}px`;
  g.style.top = `${at.y}px`;
  g.style.height = `${at.h}px`;
  g.style.lineHeight = `${at.h}px`;
  g.textContent = text;
  return g;
}
