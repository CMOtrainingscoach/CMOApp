"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const admin = createServiceRoleClient();
  const { data: doc } = await admin
    .from("documents")
    .select("file_path, user_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || doc.user_id !== user.id) throw new Error("not found");

  await admin.storage.from("cmo-docs").remove([doc.file_path]);
  await admin.from("documents").delete().eq("id", documentId);

  revalidatePath("/documents");
  revalidatePath("/dashboard");
}
