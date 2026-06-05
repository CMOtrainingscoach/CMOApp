/** Display name for this assessment flow only (does not replace global Coach professor config). */
export const IDENTITY_PROFESSOR_NAME = "Professor Eleanor Carter";

/** Persisted assistant seed when a session begins (chat transcript row 0). */
export function buildIdentityAssessmentOpeningMessage(): string {
  return `${IDENTITY_PROFESSOR_NAME} here.\n\nWe are going to skip the karaoke survey. I'd rather interview you properly — slowly — until I actually know you.\n\nI care about four layers: **what you've done** professionally (the arc, the bruises, the receipts), **where you're dragging this life next** professionally and personally, **how you want rhythm geography and obsession to coexist**, and whether you truly understand **marketing as an operating system** plus the modern fronts where reputation is built — social, podcasting, publishing, alliances.\n\nYou can take breaks; your thread saves. Speak in vignettes whenever you like — specificity beats polish.\n\nStart wherever your gut pulls you: what's the shortest honest version of your professional history *so far*, and what's the wager you're placing on yourself for the chapter ahead?`;
}

export const identityAssessmentCopy = {
  assessmentTitle: "Executive Identity — Deep Dive",
  landingLead:
    "An intensive conversational interview — not boxes and sliders — so Eleanor Carter understands your history, ambitions, ideal life rhythms, hobbies, sharp edges, and how you truly show up across marketing media and storytelling channels.",
  landingBody:
    "When you've said enough together, she synthesizes a Brainmap (your identity graph) and a dossier focused on launching or sharpening your personal brand with credible next moves.",
  startCta: "Begin conversation",
  resumeCta: "Continue your session",
  introTitle: "What this asks of you",
  introBullets: [
    "Write like you're across the table — stories, tensions, specificity.",
    "Return whenever you wish; transcript autosaves.",
    "She will push on blurry answers; that's intentional.",
    "Finish only when YOU feel surfaced — synthesis runs after completion.",
    "Outcome: actionable personal-brand scaffolding + exploratory Brainmap.",
  ],
  resultsReportTab: "Professor dossier",
  resultsBrainmapTab: "Brainmap",
  generating: "Synthesizing your executive identity dossier & Brainmap…",
  generateFailed:
    "The Professor could not finish the synthesis. You can retry once more signal is intact.",
  chatSubtitle: "Conversational deep dive • Autosaved",
  completeCta:
    "End interview & synthesize dossier",
  completingHint:
    "Use when you've shared career arc ambitions lifestyle passions and channel chops — synthesis becomes read-only afterward.",
};
