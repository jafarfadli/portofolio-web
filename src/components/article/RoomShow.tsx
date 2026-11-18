"use client";

import { useEffect } from "react";

/**
 * Turns the room's laptop screen to its next screenshot every 2.8s, as the work card does (site.css owns the
 * cross-fade). It holds while the room is mostly off screen and in a hidden tab, and does nothing under reduced
 * motion. Renders nothing.
 */
export function RoomShow() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stops: (() => void)[] = [];
    for (const room of document.querySelectorAll<HTMLElement>("[data-room]")) {
      const imgs = [...room.querySelectorAll<HTMLImageElement>("[data-show] img")];
      if (imgs.length < 2) continue;
      let at = 0;
      let seen = false;
      const io = new IntersectionObserver((e) => { seen = e.at(-1)!.isIntersecting; }, { threshold: 0.35 });
      io.observe(room);
      const timer = window.setInterval(() => {
        if (!seen || document.hidden) return;
        const prev = imgs[at];
        at = (at + 1) % imgs.length;
        prev.classList.remove("is-on");
        prev.classList.add("is-out");
        window.setTimeout(() => prev.classList.remove("is-out"), 720);
        imgs[at].classList.add("is-on");
      }, 2800);
      stops.push(() => { io.disconnect(); window.clearInterval(timer); });
    }
    return () => stops.forEach((s) => s());
  }, []);
  return null;
}
