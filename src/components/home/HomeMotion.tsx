"use client";

import { useEffect } from "react";
import { initHomeMotion } from "./home-motion";

/** Attaches all home-page motion to the server-rendered DOM. Renders nothing. */
export function HomeMotion() {
  useEffect(() => {
    try {
      return initHomeMotion(document);
    } catch (err) {
      // The server-rendered page is complete without motion; a failed init must not take it down.
      console.error("[HomeMotion] init failed", err);
      return () => {};
    }
  }, []);
  return null;
}
