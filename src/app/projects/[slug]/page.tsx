import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article/ArticlePage";
import { getArticleView } from "@/content/article";
import { plainText } from "@/content/derive";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";
import { fullName } from "@/lib/name";
import { siteBase } from "@/lib/site-base";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const db = getDb();
  const view = getArticleView(db, (await params).slug);
  if (!view) return { title: "Not found" };
  const owner = getProfile(db);
  const title = `${view.room.name}: ${plainText(view.article.hook)}`;
  const description = plainText(view.article.problem.say);
  return {
    title,
    description,
    ...(owner ? siteBase(owner.siteUrl) : {}),
    openGraph: {
      type: "article", url: `/projects/${view.room.slug}`, title, description,
      ...(owner ? { siteName: fullName(owner) } : {}),
    },
  };
}

export default async function ProjectArticle({ params }: Props) {
  const db = getDb();
  const view = getArticleView(db, (await params).slug);
  const owner = getProfile(db);
  if (!view || !owner) notFound();
  return <ArticlePage view={view} ownerName={`${owner.firstName} ${owner.lastName}`} />;
}
