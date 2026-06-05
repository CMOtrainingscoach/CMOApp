"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { AssessmentSession } from "@/lib/career/identity-assessment/schema";
import {
  identityAssessmentCopy,
  IDENTITY_PROFESSOR_NAME,
} from "@/lib/career/identity-assessment/copy";
import { BrainmapFlowView } from "./brainmap-flow";
import { retryAssessmentFormAction } from "@/app/(app)/career/identity-assessment/actions";

function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-text-secondary">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function IdentityResults({ session }: { session: AssessmentSession }) {
  if (session.status === "failed") {
    return (
      <div className="card-premium p-8 space-y-4 border-red-900/35">
        <h2 className="font-display text-xl gold-text">Synthesis paused</h2>
        <p className="text-sm text-text-secondary">
          {identityAssessmentCopy.generateFailed}
        </p>
        {session.generationError && (
          <pre className="text-xs text-text-muted whitespace-pre-wrap rounded-lg bg-background/80 p-3 border border-border">
            {session.generationError}
          </pre>
        )}
        <form action={retryAssessmentFormAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button type="submit" className="btn-gold px-5 py-2 text-sm">
            Retry synthesis
          </button>
        </form>
      </div>
    );
  }

  if (
    session.status !== "completed" ||
    !session.finalReport ||
    !session.profile
  ) {
    return null;
  }

  const r = session.finalReport;
  const profile = session.profile;
  const hasBrainmap = Boolean(session.brainmap);

  return (
    <Tabs defaultValue="report" className="w-full">
      <TabsList
        className={`w-full mb-6 ${
          hasBrainmap
            ? "grid grid-cols-2 sm:inline-flex"
            : "inline-flex"
        }`}
      >
        <TabsTrigger value="report">
          {identityAssessmentCopy.resultsReportTab}
        </TabsTrigger>
        {hasBrainmap && (
          <TabsTrigger value="brainmap">
            {identityAssessmentCopy.resultsBrainmapTab}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="report" className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
            {IDENTITY_PROFESSOR_NAME}
          </p>
          <h1 className="font-display text-3xl gold-text tracking-tight">
            Executive identity dossier
          </h1>
          <p className="text-text-secondary">{profile.headline}</p>
        </header>

        <Section title="Executive identity summary">
          <Md>{r.executiveIdentitySummary}</Md>
        </Section>

        <Section title="Personal brand thesis">
          <Md>{r.personalBrandThesis}</Md>
        </Section>

        <Section title="Recommended positioning">
          <Md>{r.recommendedPositioning}</Md>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Strengths">
            <BulletList items={r.strengths} />
          </Section>
          <Section title="Blind spots">
            <BulletList items={r.blindSpots} />
          </Section>
          <Section title="Ideal industries / categories">
            <BulletList items={r.idealIndustriesCategories} />
          </Section>
          <Section title="Signature topics to own">
            <BulletList items={r.signatureTopicsToOwn} />
          </Section>
        </div>

        <Section title="Content & authority strategy">
          <Md>{r.contentAuthorityStrategy}</Md>
        </Section>

        <Section title="Lifestyle–career alignment">
          <Md>{r.lifestyleCareerAlignmentNotes}</Md>
        </Section>

        <Section title="12-month executive identity roadmap">
          <div className="space-y-4">
            {r.twelveMonthRoadmap.map((q) => (
              <div key={q.quarter} className="card-premium border-border p-5">
                <h3 className="font-display text-lg gold-text mb-2">{q.quarter}</h3>
                <p className="text-sm text-text-secondary mb-3">{q.focus}</p>
                <ul className="list-disc pl-5 text-sm text-text-muted space-y-1">
                  {q.milestones.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Professor recommendations">
          <ul className="space-y-4">
            {r.professorRecommendations.map((rec) => (
              <li
                key={rec.id}
                className="rounded-xl border border-border bg-background/50 p-4"
              >
                <p className="text-sm font-medium text-gold-200">{rec.title}</p>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  {rec.body}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <details className="card-premium p-5 border-border text-sm">
          <summary className="cursor-pointer font-medium text-gold-200">
            Structured profile (detail)
          </summary>
          <dl className="mt-4 space-y-3 text-text-secondary">
            <ProfileBlock label="Ambitions" items={profile.professionalAmbitions} />
            <ProfileBlock label="Capabilities" items={profile.coreCapabilities} />
            <ProfileBlock
              label="Interests"
              items={profile.marketingBusinessCreativeInterests}
            />
            <ProfileBlock label="Lifestyle" items={profile.lifestylePriorities} />
            <ProfileBlock label="Hobbies & fascinations" items={profile.hobbiesAndFascinations} />
            <ProfileBlock
              label="Industries / audiences"
              items={profile.preferredIndustriesAndAudiences}
            />
            <ProfileBlock label="Values & worldview" items={profile.valuesTasteWorldview} />
            <dt className="text-text-muted text-xs uppercase">Reputation goals</dt>
            <dd className="leading-relaxed">{profile.executiveReputationGoals}</dd>
            <dt className="text-text-muted text-xs uppercase">Communication</dt>
            <dd className="leading-relaxed">{profile.communicationStyleNotes}</dd>
            <ProfileBlock label="Authority angles" items={profile.authorityBuildingAngles} />
            <ProfileBlock label="Weak spots" items={profile.weaknessesBlindSpots} />
          </dl>
        </details>

        <form action={retryAssessmentFormAction} className="pt-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <button type="submit" className="btn-ghost text-sm px-4 py-2 border border-border rounded-lg">
            Regenerate synthesis
          </button>
        </form>
      </TabsContent>

      {hasBrainmap && session.brainmap && (
      <TabsContent value="brainmap" className="space-y-4">
        <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
          Explore clustered themes. Node sizes reflect stakes and repetition in your interview —
          richer stories create heavier anchors. Toggle clusters to simplify the canvas; click any
          node for citations back to transcript turns plus her interpretation.
        </p>
        <BrainmapFlowView
          bundle={session.brainmap}
          conversation={session.conversation}
          answers={session.answers}
        />
      </TabsContent>
      )}
    </Tabs>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl tracking-tight gold-text">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1.5 leading-relaxed">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

function ProfileBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <>
      <dt className="text-text-muted text-xs uppercase tracking-wide">{label}</dt>
      <dd>
        <ul className="list-disc pl-4 space-y-0.5 mt-1">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </dd>
    </>
  );
}
