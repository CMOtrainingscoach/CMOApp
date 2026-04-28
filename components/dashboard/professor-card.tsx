import Link from "next/link";
import Image from "next/image";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle } from "lucide-react";

export function ProfessorCard({
  briefing,
  name = "AI CMO Professor",
  avatarUrl,
}: {
  briefing: string;
  name?: string;
  avatarUrl?: string | null;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Sparkles className="size-3.5" /> {name}
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
          {avatarUrl ? (
            <>
              <Image
                src={avatarUrl}
                alt={name}
                fill
                sizes="(max-width: 1280px) 100vw, 300px"
                className="object-cover object-top"
                priority={false}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, transparent 50%, rgba(10,10,10,0.55) 100%)",
                }}
              />
              <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300">
                  In Session
                </div>
                <span className="text-[10px] tracking-[0.18em] uppercase text-gold-200/90">
                  {name}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 50% 30%, rgba(232,198,110,0.18) 0%, transparent 60%)",
                }}
              />
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 m-auto h-full w-full"
                aria-hidden
              >
                <defs>
                  <radialGradient id="prof-skin" cx="0.5" cy="0.4">
                    <stop offset="0%" stopColor="#d8c39a" />
                    <stop offset="100%" stopColor="#5a4a2f" />
                  </radialGradient>
                  <linearGradient id="prof-suit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a1a" />
                    <stop offset="100%" stopColor="#0a0a0a" />
                  </linearGradient>
                </defs>
                <ellipse cx="100" cy="80" rx="34" ry="42" fill="url(#prof-skin)" />
                <path
                  d="M62 130 Q100 100 138 130 L150 200 L50 200 Z"
                  fill="url(#prof-suit)"
                  stroke="#D4AF37"
                  strokeOpacity="0.25"
                  strokeWidth="0.5"
                />
                <path
                  d="M70 80 Q100 50 130 80 Q130 60 100 50 Q70 60 70 80 Z"
                  fill="#1a1208"
                />
              </svg>
            </>
          )}
        </div>

        <p className="text-sm leading-relaxed text-text-secondary">
          {briefing}
        </p>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/professor">
            <MessageCircle className="size-4" />
            Chat with your Professor
          </Link>
        </Button>
      </CardBody>
    </Card>
  );
}
