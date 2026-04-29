import Image from "next/image";

export function QuoteBand() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary">
      <Image
        src="/quote-mountain.png"
        alt=""
        fill
        priority={false}
        sizes="(max-width: 1024px) 100vw, 1200px"
        className="object-cover object-center select-none pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.65) 45%, rgba(10,10,10,0.35) 100%), linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.85) 100%)",
        }}
      />
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
