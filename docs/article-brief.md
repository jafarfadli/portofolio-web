# Brief: write your project's article for the portfolio

You are the coding agent for one of the owner's projects, running in clinky, the tool the owner's coding sessions run in. The owner's portfolio shows each featured project as an article at
`/projects/<slug>`. Its selling point is the architecture diagram. You know this project's code best, so you write
the article.

## What to produce

Write these in your own repo, at its root, and nowhere else:

- `portfolio-article.json`, which follows `article-schema.json` (sent with this brief). `article-example.clinky.json` is a complete example.
- `portfolio-article/`: 0 to 2 screenshots (PNG or JPEG, at least 1440px wide) that the JSON names under `shots`.

Do not change anything else in your repo for this, and do not touch the portfolio's repo. The owner imports your
file with `pnpm article:import <your repo folder>`.

## The parts, and what each is for

| Field | What it is | Limits |
|------|------------|--------|
| `version` | Always the number `1`. | |
| `slug` | The project's slug on the portfolio, like `debt-report`. The owner tells you. If unsure, write your best guess and tell the owner, who imports with `--slug`. | lowercase words with hyphens |
| `hook` | One question that makes a stranger want to read on. Not a summary. | 60 to 140 characters |
| `facts` | `year`, `role` (like "Solo, design to deploy"), `team` (like "Me and two others") | 20 / 60 / 60 |
| `problem.say` | The problem in one sentence. | up to 140 |
| `problem.points` | 2 to 4 concrete facts about the problem. Bold the key phrase in each with `**...**`. | up to 160 each |
| `approach.say` | The idea of the solution in one sentence. | up to 140 |
| `approach.calls` | 2 or 3 decisions: `title`, `body` (why), `gaveUp` (what it cost). | 60 / 200 / 120 |
| `architecture` | The diagram, explained below. | |
| `results.say` | The outcome in one sentence. | up to 140 |
| `results.stats` | 2 or 3 numbers. Each has `value` (short: `12`, `4x`, `-38%`, `<1s`), `label`, `source`, `sample`. | 10 / 60 / 200 |
| `shots` | `file`, `alt` (what the screen shows, for a blind reader), `caption`. The owner can edit both later. | `alt` up to 300, `caption` up to 160 |

### Markup

Four places take markup: `hook`, every `say`, each item of `problem.points` and the `body` of each `approach.calls` entry. There, `**bold**` marks a key phrase and `_soft_` sets a phrase in the thin wide style. In `hook` and every `say`, mark the turn of the sentence with `_..._`, as the example does. Every other field is plain text: do not put markup in it. No links, no HTML, and no long dashes (– or —) anywhere: use a comma, colon or full stop.

### The architecture diagram

It is the reason people read the article. Make it true to the code, and specific.

- `zones`: 2 to 4 columns, left to right, for example "Your devices", "Server", "Workers", "Outside". Each name is up to 28 characters.
- `nodes`: 4 to 12 parts. Each has:
  - `id`: lowercase, like `session-server`;
  - `zone`: the column index, from 0;
  - `row`: 0 to 3, top to bottom;
  - `name`, up to 32 characters;
  - `tech`: the real technology, like "Go, chi" or "Postgres 16", up to 40;
  - `note`: its job in a few words, up to 90;
  - `kind`, optional: `person` for a person or their device, `store` for a database or files, `ext` for a service you do not run.

  No two parts share a zone and row. Put parts that talk to each other in neighbouring zones or rows where you can:
  wires are drawn in the gaps between parts.
- `edges`: 1 to 20 wires, each `from`, `to` and a 1 to 3 word `label` (up to 24 characters) saying what runs on it ("HTTPS", "SQL", "SSE events",
  "webhook"). One direction per pair of parts: name a two-way link once, like "charge, webhook".
- `flows`: 1 to 3 scenarios a reader can follow, like "A customer pays" (`title` up to 40 characters). Each has 2 to 5 `steps`. A step's `at`
  lists up to 12 parts and wires it lights (wires as `"from>to"`), and its `text` says what happens in one sentence, up to 160 characters.

### Numbers

- **Never invent a number.** Each stat needs a `source`: where it comes from (a log, a query, a count, a measurement), specific enough that the owner can check it.
- If you cannot measure something, either leave it out or set `"sample": true` and say in `source` what would measure it. The site then prints "(sample)" next to it.

### Disguise

The page is public:
- No client names, people's names, internal hostnames, IPs, keys, tokens or real repo names.
- Name a client by its kind ("a government finance team").
- In screenshots, every name, number or record that belongs to a client or a real person must be dummy data before you capture.

## Steps

1. Read your own code: entry points, services, data stores, queues, external APIs. List the parts and what flows between them.
2. Write `portfolio-article.json`, following the example's tone: short, concrete, no superlatives, English.
3. If you have a UI, capture up to 2 screenshots with dummy data, at least 1440px wide, into `portfolio-article/`.
4. Validate the file against `article-schema.json`. The schema checks shapes and lengths only. Check the rest by hand, because the importer refuses the file for any of these:
   - two parts with the same `id`;
   - a `zone` beyond the `zones` list;
   - two parts in the same zone and row;
   - a wire from a part to itself, or the same wire (`from` and `to`) listed twice;
   - an `at` entry that is neither a part `id` nor a listed wire written `"from>to"`;
   - an `edges` end (`from` or `to`) that is not a part `id`;
   - a long dash (– or —) in any text;
   - a screenshot under 1440px wide, a screenshot that is a link (symlink) or not an image, and a `portfolio-article.json` that is a link.
5. Tell the owner the file is ready, and list anything you marked as a sample.

The path `portfolio-article/session.png` in the example is illustrative: name your own screenshots, and the files must exist.
