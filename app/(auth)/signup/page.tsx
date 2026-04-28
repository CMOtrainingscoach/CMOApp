import Link from "next/link";
import { Monogram } from "@/components/ui/monogram";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="relative flex items-center gap-3">
          <Monogram size={56} />
          <div>
            <div className="font-display text-xl gold-text">ME</div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-gold-400">
              CMO Ascension Mode
            </div>
          </div>
        </div>
        <div className="relative max-w-lg">
          <h1 className="font-display text-5xl leading-[1.05] text-balance">
            Build the operator
            <span className="block gold-text mt-1">the C-suite hires.</span>
          </h1>
          <p className="mt-6 text-text-secondary leading-relaxed">
            This is not another course. It is a private, agentic CMO professor
            that teaches, evaluates, remembers, and pushes you. Daily.
          </p>
        </div>
        <div className="relative text-[10px] tracking-[0.22em] uppercase text-gold-500">
          Premium. Personal. Relentless.
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <h2 className="font-display text-3xl mb-1">Request access</h2>
          <p className="text-text-muted mb-8">
            Create your private coaching account.
          </p>
          <SignupForm />
          <p className="mt-6 text-sm text-text-muted">
            Already enrolled?{" "}
            <Link
              href="/login"
              className="text-gold-300 hover:text-gold-200 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
