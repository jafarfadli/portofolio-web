"use client";

import { useEffect } from "react";

/** The A4 sheet is 210mm wide: 793.7 CSS px at 96 dpi. */
const SHEET_PX = (210 / 25.4) * 96;
/** The margin kept on each side of the sheet on a small screen. */
const SIDE = 12;

/**
 * On a screen narrower than the sheet, the whole sheet is shown at once, like a page preview, instead of at print
 * size with a sideways scroll (owner, 2026-11-18). It sets --cv-zoom on the page, and cv.css zooms the sheet by it
 * below 860px; print ignores it. Renders nothing.
 */
export function CvFit() {
  useEffect(() => {
    const root = document.documentElement;
    const fit = () => {
      const z = Math.min(1, (root.clientWidth - SIDE * 2) / SHEET_PX);
      root.style.setProperty("--cv-zoom", z.toFixed(4));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      root.style.removeProperty("--cv-zoom");
    };
  }, []);
  return null;
}
