import { Icon } from "@/components/Icon";
import { MobileMenu } from "./MobileMenu";
import { withBase } from "@/lib/base-path";

export const SECTIONS = [
  { href: "#work", label: "Work" },
  { href: "#achievements", label: "Achievements" },
  { href: "#activities", label: "Activities" },
  { href: "#experience", label: "Experience" },
] as const;

export function Nav({ name, onHome = true }: { name: string; onHome?: boolean }) {
  // Off the home page the section links lead back to it, the bar is solid from the start (the home page's script that
  // turns it solid only runs there), and Work is the current section.
  const home = withBase("/");
  const sections = onHome ? SECTIONS : SECTIONS.map((s) => ({ ...s, href: `${home}${s.href}` }));
  return (
    <header className={onHome ? "nav" : "nav is-solid"} data-nav>
      <a className="brand" href={onHome ? "#top" : home}>{name}</a>
      <nav className="nav-links" aria-label="Sections">
        {sections.map((s) => (
          <a key={s.href} href={s.href} aria-current={!onHome && s.label === "Work" ? "true" : undefined}>{s.label}</a>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="btn btn-stock" href={withBase("/cv")}>Download CV <Icon name="download" /></a>
        <MobileMenu sections={sections} />
      </div>
    </header>
  );
}
