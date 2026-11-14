import type { HomeContent } from "@/content/home";
import { About } from "./About";
import { Achievements } from "./Achievements";
import { Activities } from "./Activities";
import { Closing } from "./Closing";
import { Experience } from "./Experience";
import { Hero } from "./Hero";
import { Nav } from "./Nav";
import { Work } from "./Work";

export function HomePage({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p } = content;
  return (
    <>
      <a className="skip" href="#work">Skip to work</a>
      <div className="weave" aria-hidden="true" />
      <div className="cord" aria-hidden="true"><span className="cord-fill" /></div>
      <Nav name={`${p.firstName} ${p.lastName}`} />
      <main id="top">
        <Hero content={content} qrDataUrl={qrDataUrl} />
        <About content={content} />
        <Work projects={content.projects} />
        <Achievements items={content.achievements} />
        <Activities items={content.activities} />
        <Experience experiences={content.experiences} education={content.education} />
        <Closing profile={p} />
      </main>
    </>
  );
}
