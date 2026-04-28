export function QuoteBand() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.95) 100%), radial-gradient(ellipse at 70% 100%, rgba(212,175,55,0.18) 0%, transparent 60%)",
          backgroundColor: "#0a0a0a",
        }}
      />
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-40"
        aria-hidden
      >
        <defs>
          <linearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2e16" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
        </defs>
        <path
          d="M0 220 L0 130 L150 60 L300 110 L500 40 L720 100 L900 50 L1050 95 L1200 70 L1200 220 Z"
          fill="url(#mtn)"
        />
        <path
          d="M0 220 L0 170 L200 130 L420 165 L640 120 L820 160 L1000 130 L1200 155 L1200 220 Z"
          fill="#1a1208"
          opacity="0.7"
        />
      </svg>
      <div className="relative px-8 py-10 lg:px-14 lg:py-14">
        <div className="text-gold-400 text-3xl font-display leading-none mb-3">
          &ldquo;
        </div>
        <p className="font-display text-2xl lg:text-[28px] leading-snug text-text-primary max-w-3xl">
          A CMO&apos;s job is not to get leads.
          <br />
          It&apos;s to build a growth engine the business cannot live without.
        </p>
        <div className="mt-5 text-[11px] tracking-[0.32em] uppercase text-gold-500">
          Think system. Drive impact. Lead like an owner.
        </div>
      </div>
    </div>
  );
}
