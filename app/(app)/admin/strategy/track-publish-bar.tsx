"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setTrackPublished } from "./actions";

export function TrackPublishBar({
  trackId,
  trackTitle,
  labSlug,
  labLabel,
  labTrackHref,
  isActive,
}: {
  trackId: string;
  trackTitle: string;
  labSlug: "strategy" | "pl";
  labLabel: string;
  labTrackHref: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(active: boolean) {
    start(async () => {
      try {
        await setTrackPublished({ trackId, labSlug, isActive: active });
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  if (isActive) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/[0.04]">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="!normal-case text-sm sm:text-base tracking-tight text-text-primary font-semibold flex flex-wrap items-center gap-2">
                <Eye className="size-4 text-emerald-300" /> Published · learners
                can open this track
              </CardTitle>
              <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                <span className="text-text-secondary">{trackTitle}</span> is live
                in the lab until you unpublish it.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" asChild className="text-text-muted">
                <a href={labTrackHref} target="_blank" rel="noopener noreferrer">
                  View in lab ↗
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-text-muted hover:text-amber-200"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      "Unpublish this track? Learners will see it as Coming soon.",
                    )
                  )
                    return;
                  run(false);
                }}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Unpublish (draft)
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border-gold/35 bg-gold-500/[0.04]">
      <CardHeader className="pb-2">
        <CardTitle className="!normal-case text-sm sm:text-base tracking-tight text-text-primary font-semibold flex flex-wrap items-center gap-2">
          <Rocket className="size-4 text-gold-300" /> Draft — not visible to learners
          as an active track
        </CardTitle>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Publish when content is ready. Unpublished tracks show as Coming soon to
          learners until you publish here.
        </p>
      </CardHeader>
      <CardBody className="pt-0">
        <Button
          variant="gold"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `Publish "${trackTitle}"? Learners will see it as Active in ${labLabel}.`,
              )
            )
              return;
            run(true);
          }}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          Publish track
        </Button>
      </CardBody>
    </Card>
  );
}
