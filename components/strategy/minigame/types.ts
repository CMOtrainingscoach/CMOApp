export type QuestionKind =
  | "multiple_choice"
  | "true_false"
  | "fill_step"
  | "case_scenario";

export type McPayload = { options: string[] };
export type TfPayload = Record<string, never>;
export type FillPayload = {
  steps: { text: string; is_blank: boolean }[];
  options: string[];
};
export type CasePayload = Record<string, never>;

export type AnyPayload = McPayload | TfPayload | FillPayload | CasePayload;

export type RunnerQuestion = {
  id: string;
  ord: number;
  kind: QuestionKind;
  prompt: string;
  payload: AnyPayload;
  explanation: string;
  xp: number;
};

export type AnswerValue =
  | { kind: "multiple_choice"; index: number }
  | { kind: "true_false"; value: boolean }
  | { kind: "fill_step"; index: number }
  | { kind: "case_scenario"; text: string };

export type FeedbackResult = {
  correct: boolean;
  explanation: string;
  feedback?: string;
  xp_awarded?: number;
};
