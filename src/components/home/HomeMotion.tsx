"use client";

import { useEffect } from "react";
import { initHomeMotion } from "./home-motion";

/** Attaches all home-page motion to the server-rendered DOM. Renders nothing. */
export function HomeMotion() {
  useEffect(() => initHomeMotion(document), []);
  return null;
}
