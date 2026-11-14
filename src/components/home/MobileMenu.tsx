"use client";

import { useEffect, useId, useRef, useState } from "react";

type Section = { href: string; label: string };

export function MobileMenu({ sections }: { sections: readonly Section[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="btn btn-line menu-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div id={id} className="menu-sheet on-stock" hidden={!open}>
        <nav aria-label="Sections">
          {sections.map((s, i) => (
            <a key={s.href} ref={i === 0 ? firstLink : undefined} href={s.href} onClick={() => setOpen(false)}>
              {s.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-ink" href="/cv" onClick={() => setOpen(false)}>Download CV</a>
      </div>
    </>
  );
}
