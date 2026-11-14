import { Icon } from "@/components/Icon";
import type { Profile } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Closing({ profile: p }: { profile: Profile }) {
  return (
    <section className="section closing" id="contact" aria-labelledby="contact-h">
      <SectionHead id="contact-h" title="Let's talk." style={{ marginBottom: 0 }} />
      <p className="sub">{p.closingLine}</p>
      <div className="hero-actions">
        <a className="btn btn-stock" href={`mailto:${p.email}`}>Email me <Icon name="mail" /></a>
        <a className="btn btn-line" href="/cv">Download CV <Icon name="download" /></a>
      </div>
      <div className="socials">
        <a href={p.githubUrl}><Icon name="github" /><span>GitHub</span></a>
        <a href={p.linkedinUrl}><Icon name="linkedin" /><span>LinkedIn</span></a>
        <a href={`mailto:${p.email}`}><Icon name="mail" /><span>{p.email}</span></a>
      </div>
      <footer className="footer">
        <span>{p.firstName} {p.lastName}, {new Date().getFullYear()}</span>
        <span>Built with Next.js, served from a Mac mini</span>
      </footer>
    </section>
  );
}
