import type { Viewport } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { BASE_PATH, withBase } from "@/lib/base-path";
import "./site.css";

const archivo = localFont({
  src: "../fonts/archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

/**
 * Runs before first paint. On "/" with motion allowed, marks the page so site.css can hold the entrance start state
 * until HomeMotion takes over (see "First-load entrance" in site.css). On the first visit of a browser session it also
 * holds the page for the agent swarm to build (swarm-pending). Other routes never get the classes.
 */
const MOTION_PENDING =
  `(function(){try{var h=location.pathname.replace(/\\/$/,"");if(h===${JSON.stringify(BASE_PATH)}&&!matchMedia("(prefers-reduced-motion: reduce)").matches){var c=document.documentElement.classList;c.add("motion-pending");var built=true;try{built=sessionStorage.getItem("swarm-built")==="1"}catch(e){}if(!built)c.add("swarm-pending")}}catch(e){}})()`;

/** Texture URLs that move with the mount path; empty at the root, where site.css already points at the right place. */
const TEXTURE_VARS = BASE_PATH
  ? ({ "--tex-twill": `url("${withBase("/textures/twill.png")}")`, "--tex-webbing": `url("${withBase("/textures/webbing.png")}")` } as React.CSSProperties)
  : undefined;

export const viewport: Viewport = { themeColor: "#1d2640" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={archivo.variable} style={TEXTURE_VARS} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: MOTION_PENDING }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
