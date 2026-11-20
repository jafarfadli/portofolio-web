import { getArticleView } from "@/content/article";
import { plainText } from "@/content/derive";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";
import { fullName } from "@/lib/name";
import { clip, OG_SIZE, OG_TYPE, ogCard } from "@/lib/og-card";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = "Project story card: the project's name and the question it answers";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const view = getArticleView(db, (await params).slug);
  const owner = getProfile(db);
  return ogCard({
    label: "Project story",
    title: view?.room.name ?? "Project",
    text: view ? clip(plainText(view.article.hook), 140) : "",
    footLeft: owner ? fullName(owner) : "",
    footRight: "Read the story",
  });
}
