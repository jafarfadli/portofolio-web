import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article/ArticlePage";
import { getArticleView } from "@/content/article";
import { plainText } from "@/content/derive";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = getArticleView(getDb(), (await params).slug);
  if (!view) return { title: "Not found" };
  return { title: `${view.room.name}: ${plainText(view.article.hook)}`, description: plainText(view.article.problem.say) };
}

export default async function ProjectArticle({ params }: Props) {
  const db = getDb();
  const view = getArticleView(db, (await params).slug);
  const owner = getProfile(db);
  if (!view || !owner) notFound();
  return <ArticlePage view={view} ownerName={`${owner.firstName} ${owner.lastName}`} />;
}
