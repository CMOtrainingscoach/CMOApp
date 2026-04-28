import Link from "next/link";
import { Suspense } from "react";
import { Monogram } from "@/components/ui/monogram";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-screen"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, #E8C66E 0%, transparent 50%), radial-gradient(circle at 70% 70%, #8B6F2F 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Monogram size={56} />
            <div>
              <div className="font-display text-xl gold-text">ME</div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-gold-400">
                CMO Ascension Mode
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-5xl leading-[1.05] text-balance">
            Discipline today. Freedom tomorrow.
            <span className="block gold-text mt-1">Lead like a CMO.</span>
          </h1>
          <p className="mt-6 text-text-secondary leading-relaxed">
            Your private AI Professor and executive coach. Daily missions,
            ruthless feedback, and a personalised CMO curriculum that compounds
            every week.
          </p>
        </div>

        <div className="relative">
          <p className="font-display italic text-text-muted text-lg leading-relaxed max-w-md">
            &ldquo;A CMO&apos;s job is not to get leads. It&apos;s to build a
            growth engine the business cannot live without.&rdquo;
          </p>
          <div className="mt-3 text-[10px] tracking-[0.22em] uppercase text-gold-500">
            Think system. Drive impact. Lead like an owner.
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Monogram size={48} />
            <div className="font-display text-lg gold-text">CMO Ascension</div>
          </div>
          <h2 className="font-display text-3xl mb-1">Welcome back</h2>
          <p className="text-text-muted mb-8">Sign in to continue your ascent.</p>
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-sm text-text-muted">
            New to the program?{" "}
            <Link
              href="/signup"
              className="text-gold-300 hover:text-gold-200 underline-offset-4 hover:underline"
            >
              Request access
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
