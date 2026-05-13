import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { DocumentsWorkspace } from "./workspace";
import type { DocumentProfessorReview } from "@/components/documents/document-professor-review-panel";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const docList = docs ?? [];
  let reviewsRaw: DocumentProfessorReview[] = [];

  const docIds = docList.map((d) => d.id).filter(Boolean);
  if (docIds.length > 0) {
    const { data: fetched } = await supabase
      .from("document_professor_reviews")
      .select(
        "id, document_id, review_angle, feedback, opening_question, created_at",
      )
      .eq("user_id", user.id)
      .in("document_id", docIds)
      .order("created_at", { ascending: false });
    reviewsRaw = (fetched ?? []) as DocumentProfessorReview[];
  }

  const reviewsByDocId: Record<string, DocumentProfessorReview[]> = {};
  for (const r of reviewsRaw) {
    if (!reviewsByDocId[r.document_id]) reviewsByDocId[r.document_id] = [];
    reviewsByDocId[r.document_id].push(r);
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Upload strategies, briefs, decks. The Professor reads, summarizes, remembers."
      />
      <div className="px-6 lg:px-8 pb-12">
        <DocumentsWorkspace docs={docList} reviewsByDocId={reviewsByDocId} />
      </div>
    </>
  );
}
