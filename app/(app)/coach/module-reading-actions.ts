"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/** Kept separate from `coach/actions.ts` so Client Components can import without pulling the full Coach action graph. */
export async function createTaskFromModuleBook(opts: {
  bookId: string;
  moduleId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const { data: book, error: bookErr } = await supabase
    .from("strategy_module_books")
    .select("id, module_id, title, author, url, notes")
    .eq("id", opts.bookId)
    .maybeSingle();

  if (bookErr) throw bookErr;
  if (!book || book.module_id !== opts.moduleId) {
    throw new Error("Book not found for this module.");
  }

  const parts: string[] = [];
  if (book.author) parts.push(`Author: ${book.author}`);
  if (book.url) parts.push(`Link: ${book.url}`);
  if (book.notes) parts.push(book.notes as string);

  const description =
    parts.length > 0
      ? parts.join("\n\n")
      : "Complete this reading, then check the task off in Coach when done.";

  const deadline = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

  const metadata: Json = {
    kind: "module_reading",
    book_id: opts.bookId,
    module_id: opts.moduleId,
  };

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: `Read: ${book.title as string}`,
    description,
    category: "module_reading",
    difficulty: 2,
    deadline,
    source: "strategy_lab",
    metadata,
  });

  if (error) throw error;

  revalidatePath("/coach");
  revalidatePath("/dashboard");
}
