import { z } from "zod";

/** Eight wizard phases (0–7 index). */
export const assessmentPhaseKeys = [
  "ambition",
  "knowledge",
  "interests",
  "lifestyle",
  "values",
  "presence",
  "positioning",
  "authority",
] as const;

export type AssessmentPhaseKey = (typeof assessmentPhaseKeys)[number];

export const BRAINMAP_CLUSTER_IDS = [
  "strategic_interests",
  "lifestyle_drivers",
  "authority_themes",
  "brand_signals",
  "knowledge_assets",
  "career_direction",
] as const;

export type BrainmapClusterId = (typeof BRAINMAP_CLUSTER_IDS)[number];

export const brainmapNodeKindSchema = z.enum([
  "interest",
  "capability",
  "value",
  "industry",
  "executive_trait",
  "hobby",
  "lifestyle_desire",
  "authority_theme",
  "signal",
  "direction",
]);

export type BrainmapNodeKind = z.infer<typeof brainmapNodeKindSchema>;

export const answerTypeSchema = z.enum([
  "text_short",
  "text_long",
  "single_select",
  "multi_select",
  "likert",
  "ranking",
]);

export type AnswerType = z.infer<typeof answerTypeSchema>;

/** Persisted answer row (normalized JSON). */
export const userAnswerSchema = z.object({
  questionId: z.string(),
  phase: z.enum(assessmentPhaseKeys),
  answerType: answerTypeSchema,
  /** Primary payload: string | string[] | number | ranks map optionId → order */
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
    z.record(z.string(), z.number()),
  ]),
  intensity: z.number().min(1).max(7).optional(),
  rank: z.number().int().optional(),
  rawText: z.string().optional(),
  answeredAt: z.string(),
});

export type UserAnswer = z.infer<typeof userAnswerSchema>;

export const professorRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  relatedQuestionIds: z.array(z.string()).max(20).optional(),
});

export type ProfessorRecommendation = z.infer<
  typeof professorRecommendationSchema
>;

export const executiveIdentityProfileSchema = z.object({
  headline: z.string(),
  professionalAmbitions: z.array(z.string()).max(12),
  coreCapabilities: z.array(z.string()).max(16),
  marketingBusinessCreativeInterests: z.array(z.string()).max(16),
  lifestylePriorities: z.array(z.string()).max(12),
  hobbiesAndFascinations: z.array(z.string()).max(12),
  preferredIndustriesAndAudiences: z.array(z.string()).max(14),
  valuesTasteWorldview: z.array(z.string()).max(14),
  executiveReputationGoals: z.string(),
  communicationStyleNotes: z.string(),
  authorityBuildingAngles: z.array(z.string()).max(12),
  weaknessesBlindSpots: z.array(z.string()).max(12),
});

export type ExecutiveIdentityProfile = z.infer<
  typeof executiveIdentityProfileSchema
>;

export const roadmapQuarterSchema = z.object({
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  focus: z.string(),
  milestones: z.array(z.string()).max(8),
});

export const finalReportSchema = z.object({
  executiveIdentitySummary: z.string(),
  personalBrandThesis: z.string(),
  recommendedPositioning: z.string(),
  strengths: z.array(z.string()).max(14),
  blindSpots: z.array(z.string()).max(14),
  idealIndustriesCategories: z.array(z.string()).max(14),
  signatureTopicsToOwn: z.array(z.string()).max(14),
  contentAuthorityStrategy: z.string(),
  lifestyleCareerAlignmentNotes: z.string(),
  twelveMonthRoadmap: z.array(roadmapQuarterSchema).length(4),
  professorRecommendations: z.array(professorRecommendationSchema).max(12),
});

export type FinalReport = z.infer<typeof finalReportSchema>;

/** Turn in the persisted Professor × learner chat transcript. */
export const identityChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  /** ISO8601 when persisted (optional on draft rows). */
  createdAt: z.string().optional(),
});

export type IdentityChatTurn = z.infer<typeof identityChatTurnSchema>;

export const brainmapNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: brainmapNodeKindSchema,
  clusterId: z.enum(BRAINMAP_CLUSTER_IDS),
  weight: z.number().min(0).max(1),
  interpretation: z.string(),
  recommendedAction: z.string(),
  /** Legacy form-based assessment (optional empty in chat flow). */
  supportingQuestionIds: z.array(z.string()).max(24).optional().default([]),
  /** 0-based indices into the chat transcript (user+assistant interleaved as stored). */
  supportingTurnIndices: z.array(z.number().int().min(0)).max(48).optional(),
  supportingSnippets: z.array(z.string()).max(12),
  relatedNodeIds: z.array(z.string()).max(16),
  /** Optional layout hints from model; client may override */
  x: z.number().optional(),
  y: z.number().optional(),
  parentClusterLabel: z.string().optional(),
});

export type BrainmapNode = z.infer<typeof brainmapNodeSchema>;

export const brainmapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relation: z.string().optional(),
  strength: z.number().min(0).max(1).optional(),
});

export type BrainmapEdge = z.infer<typeof brainmapEdgeSchema>;

export const brainmapBundleSchema = z.object({
  nodes: z.array(brainmapNodeSchema).max(48),
  edges: z.array(brainmapEdgeSchema).max(96),
});

export type BrainmapBundle = z.infer<typeof brainmapBundleSchema>;

/** Full structured output from generateObject after assessment. */
export const identityAssessmentArtifactsSchema = z.object({
  profile: executiveIdentityProfileSchema,
  finalReport: finalReportSchema,
  brainmap: brainmapBundleSchema,
});

export type IdentityAssessmentArtifacts = z.infer<
  typeof identityAssessmentArtifactsSchema
>;

export const sessionStatusSchema = z.enum([
  "in_progress",
  "generating",
  "completed",
  "failed",
]);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

/** App-facing session (normalized from DB row). */
export type AssessmentSession = {
  id: string;
  userId: string;
  questionBankVersion: number;
  currentPhaseIndex: number;
  status: SessionStatus;
  /** @deprecated Chat flow uses `conversation` only. */
  answers: UserAnswer[];
  conversation: IdentityChatTurn[];
  profile: ExecutiveIdentityProfile | null;
  finalReport: FinalReport | null;
  brainmap: BrainmapBundle | null;
  uiState: Record<string, unknown> | null;
  generationError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExecutiveIdentitySessionRow = {
  id: string;
  user_id: string;
  question_bank_version: number;
  current_phase_index: number;
  status: SessionStatus;
  answers: UserAnswer[];
  executive_identity_profile: ExecutiveIdentityProfile | null;
  final_report: FinalReport | null;
  brainmap: BrainmapBundle | null;
  ui_state: Record<string, unknown> | null;
  generation_error: string | null;
  created_at: string;
  updated_at: string;
};

export const assessmentQuestionSchema = z.object({
  id: z.string(),
  phase: z.enum(assessmentPhaseKeys),
  prompt: z.string(),
  helperText: z.string().optional(),
  answerType: answerTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
  tags: z.array(z.string()).max(12),
});

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
