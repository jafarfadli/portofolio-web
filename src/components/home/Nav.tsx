import { Icon } from "@/components/Icon";
import { MobileMenu } from "./MobileMenu";
import { withBase } from "@/lib/base-path";

export const SECTIONS = [
  { href: "#work", label: "Work" },
  { href: "#achievements", label: "Achievements" },
  { href: "#activities", label: "Activities" },
  { href: "#experience", label: "Experience" },
] as const;

export function Nav({ name }: { name: string }) {
  return (
    <header className="nav" data-nav>
      <a className="brand" href="#top">{name}</a>
      <nav className="nav-links" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href}>{s.label}</a>
        ))}
      </nav>
      <div className="nav-actions">
        {/* the agent swarm's sound switch: shown and drawn by swarm.ts when motion is allowed */}
        <button type="button" className="sound-btn" data-sound hidden aria-pressed="false" aria-label="Sound" />
        <a className="btn btn-stock" href={withBase("/cv")}>Download CV <Icon name="download" /></a>
        <MobileMenu sections={SECTIONS} />
      </div>
    </header>
  );
}
