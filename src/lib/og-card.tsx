import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * The link-preview card (og:image) that LinkedIn, WhatsApp and Slack show for a shared link. Satori takes TTF, not
 * the site's variable WOFF2, so src/fonts/og holds static Archivo instances cut from it (OFL): 850/118 for the title
 * (registered as weight 900), 800/85 for the label, 500/100 for the text.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const NAVY = "#1d2640";
const STOCK = "#f2f2ee";
const SOFT = "#b4bcd3";
const CONCRETE = "#e5e4df";
const INK = "#111216";

const font = (file: string) => readFile(path.join(process.cwd(), "src/fonts/og", file));

export type OgCard = {
  /** Small caps over the title, like "Portfolio". */
  label: string;
  title: string;
  /** One or two lines under the title. */
  text: string;
  /** The concrete strip at the foot: left and right. */
  footLeft: string;
  footRight: string;
};

export async function ogCard(card: OgCard): Promise<ImageResponse> {
  const [wide, narrow, medium] = await Promise.all([
    font("archivo-black-wide.ttf"),
    font("archivo-heavy-narrow.ttf"),
    font("archivo-medium.ttf"),
  ]);
  const titleSize = card.title.length > 22 ? 84 : 108;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: NAVY }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "64px 72px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: STOCK, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 5, borderRadius: 3, background: NAVY, marginTop: -14 }} />
            </div>
            <div style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 24, letterSpacing: 4, color: SOFT, textTransform: "uppercase" }}>{card.label}</div>
          </div>
          <div style={{ marginTop: 40, fontFamily: "Archivo", fontWeight: 900, fontSize: titleSize, lineHeight: 0.95, letterSpacing: -2, color: STOCK }}>
            {card.title}
          </div>
          <div style={{ marginTop: 28, fontFamily: "Archivo", fontWeight: 500, fontSize: 36, lineHeight: 1.25, color: SOFT, maxWidth: 1000 }}>
            {card.text}
          </div>
        </div>
        <div
          style={{
            height: 104, background: CONCRETE, color: INK, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 72px", fontFamily: "Archivo", fontWeight: 800, fontSize: 28,
          }}
        >
          <div style={{ display: "flex" }}>{card.footLeft}</div>
          <div style={{ display: "flex" }}>{card.footRight}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Archivo", data: wide, weight: 900, style: "normal" },
        { name: "Archivo", data: narrow, weight: 800, style: "normal" },
        { name: "Archivo", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}

/** Cut a text to at most max characters on a word boundary, with an ellipsis. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2))}…`;
}
