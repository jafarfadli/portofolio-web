import type { Viewport } from "next";
import localFont from "next/font/local";
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
 * until HomeMotion takes over (see "First-load entrance" in site.css). Other routes never get the class.
 */
const MOTION_PENDING =
  '(function(){try{if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-pending")}catch(e){}})()';

export const viewport: Viewport = { themeColor: "#2132d6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_PENDING }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
