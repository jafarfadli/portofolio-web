import type { CardArt } from "./schema";

type SeedMedia = {
  key: string;
  file: string;
  kind: "screenshot" | "photo";
  width: number;
  height: number;
  alt: string;
  provenance: string;
};

const SCREEN = "Synthetic sample screenshot rendered from mockup/assets-src/screens. Replace with a real screenshot.";
const PHOTO = "Unsplash photo (see mockup/assets/photos/SOURCES.txt), Unsplash License. Replace with your own event photo.";

const OWNER = "The owner's own portrait, duotoned in the theme navy (see mockup/assets/photos/SOURCES.txt). Replace when the portrait changes.";

export const seedMedia: SeedMedia[] = [
  { key: "ledgerly", file: "screens/ledgerly.png", kind: "screenshot", width: 1440, height: 900, alt: "Ledgerly overview: outstanding balance, payments per week, top customers", provenance: SCREEN },
  { key: "rute", file: "screens/rute.png", kind: "screenshot", width: 780, height: 1688, alt: "Rute bottom sheet listing live bus arrivals at Harmoni Central", provenance: SCREEN },
  { key: "kanbo", file: "screens/kanbo.png", kind: "screenshot", width: 1440, height: 900, alt: "Kanbo board: a card outlined while a teammate edits it", provenance: SCREEN },
  { key: "pantau", file: "screens/pantau.png", kind: "screenshot", width: 1440, height: 900, alt: "Pantau status page: all systems operational, uptime bars per service", provenance: SCREEN },
  { key: "act-talk", file: "photos/act-talk.jpg", kind: "photo", width: 900, height: 675, alt: "A speaker presenting to a meetup audience", provenance: PHOTO },
  { key: "act-hackathon", file: "photos/act-hackathon.jpg", kind: "photo", width: 900, height: 675, alt: "A large hall of people coding at a hackathon", provenance: PHOTO },
  { key: "act-mentor", file: "photos/act-mentor.jpg", kind: "photo", width: 900, height: 675, alt: "Two students working through code on a laptop", provenance: PHOTO },
  { key: "act-workshop", file: "photos/act-workshop.jpg", kind: "photo", width: 900, height: 675, alt: "A group working on laptops around a shared table", provenance: PHOTO },
  { key: "act-conf", file: "photos/act-conf.jpg", kind: "photo", width: 900, height: 675, alt: "A conference audience in a dark hall", provenance: PHOTO },
  { key: "act-stage", file: "photos/act-stage.jpg", kind: "photo", width: 900, height: 675, alt: "A speaker on stage in front of a large screen", provenance: PHOTO },
  { key: "owner-badge", file: "photos/owner-badge.jpg", kind: "photo", width: 400, height: 500, alt: "Portrait of Muhammad Jafar Fadli in a navy suit", provenance: OWNER },
  { key: "owner-cutout", file: "photos/owner-cutout.png", kind: "photo", width: 400, height: 505, alt: "Portrait of Muhammad Jafar Fadli", provenance: OWNER },
];

export const seedProfile = {
  firstName: "Jafar",
  lastName: "Fadli",
  fullName: "Muhammad Jafar Fadli",
  role: "Full-stack Engineer",
  stackLine: "TypeScript, Next.js, Go, PostgreSQL",
  location: "Jakarta",
  availabilityNote: "Jakarta",
  openToWork: true,
  openToWorkLabel: "Open to full-time roles",
  email: "hello@jafarfadli.example",
  siteUrl: "https://jafarfadli.example",
  githubUrl: "https://github.com/jafarfadli",
  linkedinUrl: "https://linkedin.example/in/jafarfadli",
  statementLine1: "Web products :browsers:, / end to end.",
  statementLine2: "From schema :database: / to pixel :cursor:.",
  aboutText:
    "Full-stack engineer in Jakarta :pin:. I like owning a feature from the first migration to the last loading state :loading:, _and I do my best work on small teams :team: that ship every week :rocket:._",
  closingLine: "Open to full-time full-stack roles from January 2027, in Jakarta or remote.",
  cvSummary:
    "Full-stack engineer who owns features from database migration to interface. Ships TypeScript and Go products used by small businesses and commuters; strongest in Next.js, PostgreSQL, and API performance work.",
  cvLocationLine: "Jakarta, Indonesia (open to remote)",
};

type SeedProject = {
  slug: string; name: string; headline: string; period: string; roleLine: string; tags: string[];
  fieldColor: string; screenshot: string; phoneShot?: string; stickerCaption: string; cardArt: CardArt; layout: "wide" | "half";
  metricValue: string; metricLabel: string; liveUrl: string | null; codeUrl: string | null; cvTitle: string; cvLine: string;
};

export const seedProjects: SeedProject[] = [
  {
    slug: "ledgerly", name: "Ledgerly",
    headline: "**Ledgerly** helps 1,200 small shops send invoices and get paid four days sooner.",
    period: "2025", roleLine: "solo full-stack", tags: ["Next.js", "Go", "PostgreSQL", "Midtrans"],
    fieldColor: "#0E2A22", screenshot: "ledgerly", stickerCaption: "Ledgerly: invoicing for 1,200 small shops",
    cardArt: {
      print: { left: 7, top: 14, width: 58, height: 80, rot: -2.5 },
      leader: { d: "M 61.5 30 C 68 26, 70 40, 74 44", dot: { x: 61.5, y: 30 } },
      pin: { x: 74, y: 44, side: "l", big: true },
    },
    layout: "wide", metricValue: "9.4 days", metricLabel: "average time to get paid, down from 13.1",
    liveUrl: "https://ledgerly.example", codeUrl: "https://code.example/jafarfadli/ledgerly",
    cvTitle: "invoicing for small shops", cvLine: "Used by **1,200** shops; average time to get paid dropped from **13.1 to 9.4 days**.",
  },
  {
    slug: "rute", name: "Rute",
    headline: "**Rute** shows Jakarta commuters when the next bus actually arrives.",
    period: "2024", roleLine: "mobile and API", tags: ["React Native", "Go", "Redis"],
    fieldColor: "#FF6A2B", screenshot: "rute", phoneShot: "rute", stickerCaption: "Rute: live bus arrivals",
    cardArt: {
      print: { left: 12, top: 12, width: 30, height: 132, rot: -3 },
      leader: { d: "M 40 71 C 48 70, 50 52, 54 46", dot: { x: 40, y: 71 } },
      pin: { x: 54, y: 46, side: "l" },
    },
    layout: "half", metricValue: "Every 15 s", metricLabel: "live arrival refresh from GPS feeds",
    liveUrl: null, codeUrl: "https://code.example/jafarfadli/rute",
    cvTitle: "live bus arrivals for Jakarta commuters", cvLine: "Arrival times refresh every **15 seconds** from GPS feeds.",
  },
  {
    slug: "kanbo", name: "Kanbo",
    headline: "**Kanbo** lets teams of 3 to 30 plan on one board and see each other edit live.",
    period: "2024", roleLine: "team of 3", tags: ["Next.js", "WebSockets", "PostgreSQL"],
    fieldColor: "#E9E2D6", screenshot: "kanbo", stickerCaption: "Kanbo: realtime team boards",
    cardArt: {
      print: { left: 6, top: 16, width: 76, height: 70, rot: 2 },
      leader: { d: "M 37 36 C 44 24, 47 16, 52 12", dot: { x: 37, y: 36 }, ink: true },
      pin: { x: 52, y: 12, side: "l", ink: true },
    },
    layout: "half", metricValue: "<120 ms", metricLabel: "presence updates between teammates",
    liveUrl: "https://kanbo.example", codeUrl: null,
    cvTitle: "realtime team boards", cvLine: "Presence updates under **120 ms** for teams of 3 to 30.",
  },
  {
    slug: "pantau", name: "Pantau",
    headline: "**Pantau** is an open-source uptime monitor and status page that runs on a single binary.",
    period: "2023 to present", roleLine: "maintainer", tags: ["Go", "SQLite", "HTMX"],
    fieldColor: "#16161D", screenshot: "pantau", stickerCaption: "Pantau: open-source uptime monitor",
    cardArt: {
      print: { left: 30, top: 16, width: 60, height: 84, rot: 1.5, objectPosition: "center top" },
      leader: { d: "M 36 52 C 31 52, 30 40, 27 36", dot: { x: 36, y: 52 } },
      pin: { x: 27, y: 36, side: "r", big: true },
    },
    layout: "wide", metricValue: "640 stars", metricLabel: "on GitHub, 31 contributors",
    liveUrl: null, codeUrl: "https://code.example/jafarfadli/pantau",
    cvTitle: "open-source uptime monitor and status page", cvLine: "Single-binary deploy; **640** GitHub stars and **31** contributors.",
  },
];

type SeedAchievement = {
  title: string; rank: "winner" | "finalist" | "award"; rankLabel: string; description: string; year: string;
  sealText: string | null; sealCaption: string | null; caption: string; story: string; cvLine: string; cvYear: string;
  /** Media key. Temporary reuse of an activity photo until the owner supplies achievement photos. */
  photo: string;
  /** Media keys for photo2Id to photo4Id, in order. A tuple, so a fourth key is a compile error rather than silently dropped. */
  morePhotos: [] | [string] | [string, string] | [string, string, string];
};

/** Reel order: the winner first, then the CV order. */
export const seedAchievements: SeedAchievement[] = [
  { title: "Nusantara Code Cup", morePhotos: ["act-hackathon", "act-talk"], photo: "act-stage", rank: "winner", rankLabel: "Winner", description: "Software development. First of 96 finalist teams.", year: "2024", sealText: "1st", sealCaption: "Code Cup 2024", caption: "Winner, Nusantara Code Cup 2024, software development", story: "Built an offline-first clinic queue system; first of 96 finalist teams.", cvLine: "Nusantara Code Cup, software development", cvYear: "2024" },
  { title: "AWS Certified Developer", morePhotos: ["act-workshop"], photo: "act-mentor", rank: "award", rankLabel: "Certified", description: "Cloud certification, associate level.", year: "2025", sealText: null, sealCaption: null, caption: "AWS Certified Developer, Associate, 2025", story: "Certification covering serverless, IAM, and deployment pipelines.", cvLine: "AWS Certified Developer, Associate", cvYear: "2025" },
  { title: "Hackathon Jakarta Pintar", morePhotos: ["act-conf", "act-stage"], photo: "act-hackathon", rank: "finalist", rankLabel: "Finalist", description: "Hackathon, team of 4. Top 10 of 214 teams.", year: "2023", sealText: null, sealCaption: null, caption: "Finalist, Hackathon Jakarta Pintar 2023", story: "Top 10 of 214 teams with a flood-report app for RT heads.", cvLine: "Hackathon Jakarta Pintar (top 10 of 214)", cvYear: "2023" },
  { title: "Regional Programming Contest", morePhotos: ["act-mentor", "act-talk"], photo: "act-workshop", rank: "award", rankLabel: "Honorable mention", description: "Team of 3. Solved 7 of 12 problems.", year: "2023", sealText: null, sealCaption: null, caption: "Honorable mention, Regional Programming Contest 2023", story: "Solved 7 of 12 problems in five hours, team of three.", cvLine: "Regional Programming Contest", cvYear: "2023" },
  { title: "Dean's List", morePhotos: ["act-talk"], photo: "act-conf", rank: "award", rankLabel: "Dean's list", description: "Five semesters, Institut Teknologi Nusantara.", year: "2021 to 2023", sealText: null, sealCaption: null, caption: "Dean's List, 2021 to 2023", story: "Five consecutive semesters, Institut Teknologi Nusantara.", cvLine: "Five semesters, Institut Teknologi Nusantara", cvYear: "2021 to 2023" },
];

/** Default CV order for achievements: by rank, then recency. Titles reference seedAchievements. */
export const defaultCvAchievementOrder = [
  "Nusantara Code Cup",
  "AWS Certified Developer",
  "Hackathon Jakarta Pintar",
  "Regional Programming Contest",
  "Dean's List",
];

type SeedActivity = {
  title: string; subtitle: string; role: "speaker" | "organizer" | "mentor" | "volunteer"; roleLabel: string;
  year: string; photo: string; showInCv: boolean; cvLine: string;
};

export const seedActivities: SeedActivity[] = [
  { title: "JakWeb Meetup #42", subtitle: "Talk: self-hosting Next.js on a Mac mini", role: "speaker", roleLabel: "Speaker", year: "2025", photo: "act-talk", showInCv: true, cvLine: "JakWeb Meetup #42" },
  { title: "Ruang Kode Hackathon", subtitle: "48 hours, 300 participants, 3 sponsor tracks", role: "organizer", roleLabel: "Organizer", year: "2024", photo: "act-hackathon", showInCv: true, cvLine: "Ruang Kode Hackathon (300 participants)" },
  { title: "Campus Code Camp", subtitle: "Mentored 18 first-year students through their first web app", role: "mentor", roleLabel: "Mentor", year: "2024", photo: "act-mentor", showInCv: true, cvLine: "Campus Code Camp" },
  { title: "Open Source Saturday", subtitle: "Monthly session helping people land their first pull request", role: "organizer", roleLabel: "Host", year: "2023", photo: "act-workshop", showInCv: true, cvLine: "Open Source Saturday" },
  { title: "DevDays Indonesia", subtitle: "Ran the registration desk and speaker room", role: "volunteer", roleLabel: "Volunteer", year: "2023", photo: "act-conf", showInCv: false, cvLine: "DevDays Indonesia" },
  { title: "HMIF Tech Talk", subtitle: "Hosted a 400-seat evening on careers in software", role: "organizer", roleLabel: "Organizer", year: "2022", photo: "act-stage", showInCv: false, cvLine: "HMIF Tech Talk" },
];

export const seedExperiences = [
  { role: "Software Engineer", org: "Arunika Labs", location: "Jakarta", period: "Feb 2025 to now", cvPeriod: "Feb 2025 to present", summary: "Built the billing service in Go and the customer dashboard in Next.js. Cut p95 API latency from **840 ms to 210 ms**.", cvBullets: ["Built the billing service in Go and the customer dashboard in Next.js for **3,000** business accounts.", "Cut p95 API latency from **840 ms to 210 ms** by reshaping queries and adding a Redis read-through cache."] },
  { role: "Software Engineer Intern", org: "Lumbung Data", location: "remote", period: "Jun to Dec 2024", cvPeriod: "Jun 2024 to Dec 2024", summary: "Shipped a CSV import pipeline with column mapping, now used by **40 enterprise clients**.", cvBullets: ["Shipped a CSV import pipeline with column mapping and validation, now used by **40** enterprise clients."] },
  { role: "Teaching Assistant, Web Programming", org: "Institut Teknologi Nusantara", location: "", period: "Jul 2023 to May 2024", cvPeriod: "Jul 2023 to May 2024", summary: "Ran weekly labs for **120 students** and rewrote the grading scripts.", cvBullets: ["Ran weekly labs for **120** students and rewrote the automated grading scripts."] },
];

export const seedEducation = [
  { degree: "B.Sc. Computer Science", institution: "Institut Teknologi Nusantara", period: "2020 to 2024", note: "GPA **3.71 / 4.00**. Thesis on offline-first sync for field data apps.", cvNote: "GPA **3.71 / 4.00**. Thesis on offline-first sync for field data apps." },
];

/** sortOrder = array index + 1. Site chips show in this order; CV groups by first appearance. */
export const seedSkills: { groupName: string; name: string; rot: number; showOnSite: boolean }[] = [
  { groupName: "Languages", name: "TypeScript", rot: -3, showOnSite: true },
  { groupName: "Web", name: "Next.js", rot: 2, showOnSite: true },
  { groupName: "Web", name: "React", rot: -1, showOnSite: true },
  { groupName: "Languages", name: "Go", rot: 4, showOnSite: true },
  { groupName: "Data and infra", name: "PostgreSQL", rot: -2, showOnSite: true },
  { groupName: "Data and infra", name: "Redis", rot: 3, showOnSite: true },
  { groupName: "Data and infra", name: "Docker", rot: -4, showOnSite: true },
  { groupName: "Web", name: "Tailwind CSS", rot: 2, showOnSite: true },
  { groupName: "Data and infra", name: "Playwright", rot: -2, showOnSite: true },
  { groupName: "Web", name: "React Native", rot: 3, showOnSite: true },
  { groupName: "Languages", name: "SQL", rot: 0, showOnSite: false },
  { groupName: "Languages", name: "Python", rot: 0, showOnSite: false },
];
