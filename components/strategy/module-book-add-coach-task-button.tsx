"use client";

import { useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTaskFromModuleBook } from "@/app/(app)/coach/module-reading-actions";

export function ModuleBookAddCoachTaskButton({
  bookId,
  moduleId,
}: {
  bookId: string;
  moduleId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="subtle"
      className="shrink-0"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await createTaskFromModuleBook({ bookId, moduleId });
          } catch (e) {
            alert((e as Error).message);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Plus className="size-3.5" />
      )}
      Add to Coach tasks
    </Button>
  );
}
