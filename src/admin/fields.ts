/** Field definitions for the editors, and the parser that turns submitted strings into column values. */
import type { CardArt } from "@/db/schema";

export type FieldKind =
  | "text" | "textarea" | "url" | "email" | "slug" | "color" | "number" | "bool" | "enum" | "tags" | "lines" | "media" | "cardArt";
export type MediaKind = "screenshot" | "photo" | "logo";

export type Field = {
  name: string;
  label: string;
  kind: FieldKind;
  /** Empty input allowed: "null" stores null (nullable column), "blank" stores "" or [] (NOT NULL column). */
  empty?: "null" | "blank";
  help?: string;
  options?: readonly string[];
  mediaKind?: MediaKind;
  min?: number;
  max?: number;
  rows?: number;
};

export type Parsed = { values: Record<string, unknown>; errors: Record<string, string> };
type One = { value: unknown } | { error: string };

export const LONG_DASH_ERROR = "Use a comma, colon or full stop instead of a long dash.";
export const LONG_DASH = /[\u2013\u2014]/;
const DEFAULT_MAX = { text: 200, textarea: 4000 } as const;

export function parseFields(fields: readonly Field[], form: FormData): Parsed {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = form.get(f.name);
    const r = parseField(f, typeof raw === "string" ? raw : null);
    if ("error" in r) errors[f.name] = r.error;
    else values[f.name] = r.value;
  }
  return { values, errors };
}

export function parseField(f: Field, raw: string | null): One {
  if (f.kind === "bool") return { value: raw === "on" };
  const s = (raw ?? "").replace(/\r\n?/g, "\n").trim();
  if (s === "") {
    if (f.empty === "null") return { value: null };
    if (f.empty === "blank") return { value: f.kind === "tags" || f.kind === "lines" ? [] : "" };
    return { error: "Fill this in." };
  }
  if (f.kind !== "cardArt" && LONG_DASH.test(s)) return { error: LONG_DASH_ERROR };
  switch (f.kind) {
    case "text":
    case "textarea": {
      const max = f.max ?? DEFAULT_MAX[f.kind];
      return s.length > max ? { error: `Keep it under ${max} characters.` } : { value: s };
    }
    case "url":
      return parseUrl(s);
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { value: s } : { error: "Enter an email address like name@example.com." };
    case "slug":
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60
        ? { value: s }
        : { error: "Use lowercase letters, numbers and single hyphens, like my-project." };
    case "color":
      return /^#[0-9a-f]{6}$/i.test(s) ? { value: s.toLowerCase() } : { error: "Use a hex colour like #ff6a2b." };
    case "number": {
      const n = Number(s);
      if (!Number.isFinite(n)) return { error: "Enter a number." };
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        return { error: `Use a number from ${f.min} to ${f.max}.` };
      }
      return { value: n };
    }
    case "enum":
      return f.options?.includes(s) ? { value: s } : { error: "Pick one of the options." };
    case "tags": {
      const tags = s.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 12) return { error: "Use at most 12 tags." };
      if (tags.some((t) => t.length > 40)) return { error: "Keep each tag under 40 characters." };
      return { value: tags };
    }
    case "lines": {
      const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.some((l) => l.length > 300)) return { error: "Keep each line under 300 characters." };
      return { value: lines };
    }
    case "media":
      return /^\d+$/.test(s) ? { value: Number(s) } : { error: "Pick an image from the list." };
    case "cardArt":
      return parseCardArt(s);
    default:
      return { error: "This field type is not supported." };
  }
}

function parseUrl(s: string): One {
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { error: "Enter a full address starting with https://" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Use an http or https address." };
  u.pathname = u.pathname.replace(/\/{2,}/g, "/");
  return { value: u.pathname === "/" && !u.search && !u.hash ? u.origin : u.toString() };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const PATH_D = /^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]{1,400}$/;
const OBJECT_POSITION = /^[a-z0-9.%\s-]{1,40}$/i;

/** Card art is rendered into SVG and inline styles, so only known keys with numbers and path syntax survive. */
export function parseCardArt(s: string): One {
  let v: unknown;
  try {
    v = JSON.parse(s);
  } catch {
    return { error: "This is not valid JSON." };
  }
  if (!isObj(v) || !isObj(v.print) || !isObj(v.leader) || !isObj(v.pin)) return { error: "Card layout needs print, leader and pin." };
  const { print, leader, pin } = v;
  if (!["left", "top", "width", "height", "rot"].every((k) => isNum(print[k]))) {
    return { error: "print needs numbers for left, top, width, height and rot." };
  }
  if (print.objectPosition !== undefined && !(typeof print.objectPosition === "string" && OBJECT_POSITION.test(print.objectPosition))) {
    return { error: 'print.objectPosition must look like "top left" or "50% 0".' };
  }
  if (typeof leader.d !== "string" || !PATH_D.test(leader.d)) {
    return { error: "leader.d must be SVG path commands and numbers, like M 10 20 L 30 40." };
  }
  if (!isObj(leader.dot) || !isNum(leader.dot.x) || !isNum(leader.dot.y)) return { error: "leader.dot needs numbers for x and y." };
  if (!isNum(pin.x) || !isNum(pin.y) || (pin.side !== "l" && pin.side !== "r")) {
    return { error: 'pin needs numbers for x and y, and side "l" or "r".' };
  }
  for (const flag of [leader.ink, pin.big, pin.ink]) {
    if (flag !== undefined && typeof flag !== "boolean") return { error: "big and ink must be true or false." };
  }
  const art: CardArt = {
    print: {
      left: print.left as number, top: print.top as number, width: print.width as number,
      height: print.height as number, rot: print.rot as number,
      ...(typeof print.objectPosition === "string" ? { objectPosition: print.objectPosition } : {}),
    },
    leader: {
      d: leader.d,
      dot: { x: leader.dot.x, y: leader.dot.y },
      ...(typeof leader.ink === "boolean" ? { ink: leader.ink } : {}),
    },
    pin: {
      x: pin.x, y: pin.y, side: pin.side,
      ...(typeof pin.big === "boolean" ? { big: pin.big } : {}),
      ...(typeof pin.ink === "boolean" ? { ink: pin.ink } : {}),
    },
  };
  return { value: art };
}

/** A stored row as the strings the form shows. A missing row gives empty strings. */
export function toFormValues(fields: readonly Field[], row: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = row?.[f.name];
    if (f.kind === "bool") out[f.name] = v ? "on" : "";
    else if (v === null || v === undefined) out[f.name] = "";
    else if (f.kind === "tags") out[f.name] = (v as string[]).join(", ");
    else if (f.kind === "lines") out[f.name] = (v as string[]).join("\n");
    else if (f.kind === "cardArt") out[f.name] = JSON.stringify(v, null, 2);
    else out[f.name] = String(v);
  }
  return out;
}

/** The raw submitted strings, so a form that failed validation shows exactly what the owner typed. */
export function echoValues(fields: readonly Field[], form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const raw = form.get(f.name);
    out[f.name] = f.kind === "bool" ? (raw === "on" ? "on" : "") : typeof raw === "string" ? raw : "";
  }
  return out;
}
