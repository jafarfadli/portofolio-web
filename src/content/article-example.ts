import type { Article } from "@/lib/article";

/**
 * Sample article for the seeded Ledgerly project (dummy content, like the rest of the seed). Its numbers are
 * samples. The e2e tests read its words, so change them together.
 */
export const LEDGERLY_ARTICLE: Article = {
  hook: "What if a shop could send an invoice from its phone and _get paid before the week was out?_",
  facts: { year: "2025", role: "Solo, design to deploy", team: "Me, plus a designer for 2 weeks" },
  problem: {
    say: "Small shops waited two weeks to get paid, _because chasing invoices was nobody's job._",
    points: [
      "Invoices went out as **photos of a paper book**, sent over WhatsApp.",
      "Reminders depended on the owner **remembering who still owed money**.",
      "Customers had **no single place to pay**, so many paid late or not at all.",
    ],
  },
  approach: {
    say: "Make the invoice a link that _pays itself_, and let a worker do the chasing.",
    calls: [
      { title: "One link per invoice.", body: "The customer opens it, sees the total and pays there: no account, no app.", gaveUp: "a customer portal with order history." },
      { title: "A worker owns everything later.", body: "Reminders, retries and receipts run from one job table, so a restart loses nothing.", gaveUp: "editing a reminder while it is queued." },
      { title: "Server-rendered dashboard.", body: "Fast on the cheap Android phones most shop owners use.", gaveUp: "some offline behaviour." },
    ],
  },
  architecture: {
    say: "Two front doors, one API, and _a worker that owns everything that happens later._",
    zones: ["People", "Ledgerly", "Data and jobs", "Outside"],
    nodes: [
      { id: "owner", zone: 0, row: 0, name: "Shop owner", tech: "Phone or laptop", note: "Creates and sends invoices", kind: "person" },
      { id: "customer", zone: 0, row: 2, name: "Customer", tech: "Any browser", note: "Opens the pay link", kind: "person" },
      { id: "dash", zone: 1, row: 0, name: "Dashboard", tech: "Next.js", note: "Server-rendered, quick on cheap phones" },
      { id: "api", zone: 1, row: 1, name: "Go API", tech: "Go, chi", note: "Invoices, auth and payment webhooks" },
      { id: "pay", zone: 1, row: 2, name: "Pay link page", tech: "Next.js", note: "No login, one invoice" },
      { id: "db", zone: 2, row: 1, name: "PostgreSQL", tech: "Postgres 16", note: "Invoices and the job table", kind: "store" },
      { id: "worker", zone: 2, row: 2, name: "Reminder worker", tech: "Go", note: "Takes due jobs every minute" },
      { id: "midtrans", zone: 3, row: 1, name: "Midtrans", tech: "Payments", note: "Cards, e-wallets and transfers", kind: "ext" },
      { id: "wa", zone: 3, row: 2, name: "WhatsApp API", tech: "Business API", note: "Delivers the reminders", kind: "ext" },
    ],
    edges: [
      { from: "owner", to: "dash", label: "HTTPS" },
      { from: "customer", to: "pay", label: "HTTPS" },
      { from: "dash", to: "api", label: "REST" },
      { from: "pay", to: "api", label: "REST" },
      { from: "api", to: "db", label: "SQL" },
      { from: "worker", to: "db", label: "job table" },
      { from: "api", to: "midtrans", label: "charge, webhook" },
      { from: "worker", to: "wa", label: "reminders" },
    ],
    flows: [
      {
        title: "A customer pays",
        steps: [
          { at: ["customer", "customer>pay", "pay"], text: "The customer opens the link from WhatsApp. There is nothing to sign in to." },
          { at: ["pay>api", "api", "api>midtrans", "midtrans"], text: "The API asks Midtrans for a payment and sends the customer there." },
          { at: ["api", "api>db", "db"], text: "Midtrans calls back, and the API marks the invoice paid in one transaction." },
        ],
      },
      {
        title: "A reminder goes out",
        steps: [
          { at: ["worker", "worker>db", "db"], text: "Every minute the worker takes the reminders that are due from the job table." },
          { at: ["worker>wa", "wa"], text: "It sends each one through the WhatsApp API." },
          { at: ["worker", "worker>db"], text: "It records the send, so a restart never sends a reminder twice." },
        ],
      },
    ],
  },
  results: {
    say: "Shops got paid _four days sooner._",
    stats: [
      { value: "9.4", label: "days to get paid, down from 13.1", source: "Average over all paid invoices, March to June 2025.", sample: true },
      { value: "1,200", label: "shops sending invoices", source: "Active accounts in June 2025.", sample: true },
    ],
  },
  shots: [],
};
