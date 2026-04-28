import type { MemoryKind } from "@/types/database";

export type OnboardingTopicId =
  | "who_you_are"
  | "living_situation"
  | "hobbies"
  | "interests"
  | "lifestyle"
  | "marketing_knowledge"
  | "career_goal";

export type OnboardingTopic = {
  id: OnboardingTopicId;
  label: string;
  description: string;
  // Default memory kind for facts saved under this topic. The AI may
  // override per-fact for marketing_knowledge (strength vs weakness).
  memoryKind: MemoryKind;
  // Approximate number of conversational turns the Professor should spend
  // on this topic before moving on (used as guidance in the system prompt).
  targetTurns: number;
};

export const ONBOARDING_TOPICS: readonly OnboardingTopic[] = [
  {
    id: "who_you_are",
    label: "Who you are",
    description:
      "Name, age range, current role, city / country, family or relationship status.",
    memoryKind: "insight",
    targetTurns: 3,
  },
  {
    id: "living_situation",
    label: "Living situation",
    description:
      "House or apartment, alone / partner / family, work-from-home setup, environment.",
    memoryKind: "insight",
    targetTurns: 2,
  },
  {
    id: "hobbies",
    label: "Hobbies",
    description: "What the user does for fun and recovery outside of work.",
    memoryKind: "preference",
    targetTurns: 2,
  },
  {
    id: "interests",
    label: "Interests",
    description:
      "Books, podcasts, fields, thinkers, topics they obsess over.",
    memoryKind: "preference",
    targetTurns: 2,
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description:
      "Daily rhythm, training, sleep, nutrition, deep-work discipline.",
    memoryKind: "preference",
    targetTurns: 2,
  },
  {
    id: "marketing_knowledge",
    label: "Marketing knowledge",
    description:
      "Years of experience, areas of strength, weak spots, frameworks they already know.",
    memoryKind: "strength",
    targetTurns: 3,
  },
  {
    id: "career_goal",
    label: "Career goal & ambition",
    description:
      "Target role, company stage, horizon (e.g. CMO at a Series B SaaS by 2027), the why.",
    memoryKind: "career_goal",
    targetTurns: 3,
  },
] as const;

export const ONBOARDING_TOPIC_IDS: OnboardingTopicId[] =
  ONBOARDING_TOPICS.map((t) => t.id);

export function topicById(id: string): OnboardingTopic | undefined {
  return ONBOARDING_TOPICS.find((t) => t.id === id);
}
