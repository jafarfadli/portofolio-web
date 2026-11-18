import { notFound } from "next/navigation";
import { requireAdminPage } from "@/auth/admin";
import { ArticlePage } from "@/components/article/ArticlePage";
import { getArticleViewById } from "@/content/article";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

/** The editor's preview of a project's article, published or not: the public page, rendered by the admin role. */
export default async function ArticlePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = getDb();
  const view = getArticleViewById(db, id);
  const owner = getProfile(db);
  if (!view || !owner) notFound();
  return <ArticlePage view={view} ownerName={`${owner.firstName} ${owner.lastName}`} />;
}
