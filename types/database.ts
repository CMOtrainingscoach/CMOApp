export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SkillKey =
  | "strategic_thinking"
  | "finance_pl"
  | "lead_gen"
  | "brand"
  | "leadership"
  | "exec_comm"
  | "ai_marketing"
  | "lifestyle";

export type MemoryKind =
  | "career_goal"
  | "strength"
  | "weakness"
  | "reflection"
  | "decision"
  | "insight"
  | "preference"
  | "ambition";

export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "reviewed";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          headline: string | null;
          role: string | null;
          persona_summary: string | null;
          weekly_streak: number;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          kind: MemoryKind;
          content: string;
          source_doc_id: string | null;
          source_msg_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["memories"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["memories"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          file_path: string;
          mime_type: string;
          size: number;
          status: DocumentStatus;
          summary: string | null;
          key_insights: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["documents"]["Row"],
          "id" | "created_at" | "summary" | "key_insights" | "status"
        > & {
          id?: string;
          created_at?: string;
          summary?: string | null;
          key_insights?: Json | null;
          status?: DocumentStatus;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          chunk_index: number;
          content: string;
          tokens: number;
        };
        Insert: Omit<
          Database["public"]["Tables"]["document_chunks"]["Row"],
          "id"
        > & { id?: string };
        Update: Partial<
          Database["public"]["Tables"]["document_chunks"]["Row"]
        >;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          difficulty: number;
          deadline: string | null;
          status: TaskStatus;
          score: number | null;
          feedback: Json | null;
          source: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["tasks"]["Row"],
          "id" | "created_at" | "completed_at" | "score" | "feedback" | "status"
        > & {
          id?: string;
          created_at?: string;
          completed_at?: string | null;
          score?: number | null;
          feedback?: Json | null;
          status?: TaskStatus;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [];
      };
      task_submissions: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          attachments: Json | null;
          score: number | null;
          ai_feedback: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["task_submissions"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["task_submissions"]["Row"]
        >;
        Relationships: [];
      };
      learning_tracks: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          color: string | null;
          lessons_count: number;
          ord: number;
        };
        Insert: Database["public"]["Tables"]["learning_tracks"]["Row"];
        Update: Partial<
          Database["public"]["Tables"]["learning_tracks"]["Row"]
        >;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          track_id: string;
          ord: number;
          title: string;
          body: string | null;
          type: string;
          estimated_minutes: number;
        };
        Insert: Database["public"]["Tables"]["lessons"]["Row"];
        Update: Partial<Database["public"]["Tables"]["lessons"]["Row"]>;
        Relationships: [];
      };
      track_progress: {
        Row: {
          user_id: string;
          track_id: string;
          current_lesson_id: string | null;
          percent: number;
          started_at: string;
          completed_at: string | null;
        };
        Insert: Database["public"]["Tables"]["track_progress"]["Row"];
        Update: Partial<
          Database["public"]["Tables"]["track_progress"]["Row"]
        >;
        Relationships: [];
      };
      skill_scores: {
        Row: {
          user_id: string;
          skill_key: SkillKey;
          score: number;
          updated_at: string;
        };
        Insert: Database["public"]["Tables"]["skill_scores"]["Row"];
        Update: Partial<
          Database["public"]["Tables"]["skill_scores"]["Row"]
        >;
        Relationships: [];
      };
      daily_missions: {
        Row: {
          id: string;
          user_id: string;
          mission_date: string;
          study_item: string;
          task_item: string;
          reflection_prompt: string;
          lifestyle_item: string;
          status: string;
          progress_percent: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["daily_missions"]["Row"],
          "id" | "created_at" | "progress_percent" | "status"
        > & {
          id?: string;
          created_at?: string;
          progress_percent?: number;
          status?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["daily_missions"]["Row"]
        >;
        Relationships: [];
      };
      weekly_reviews: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          summary: string | null;
          wins: Json | null;
          gaps: Json | null;
          next_focus: Json | null;
          score_delta: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["weekly_reviews"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["weekly_reviews"]["Row"]
        >;
        Relationships: [];
      };
      reflections: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          response: string;
          mood: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reflections"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["reflections"]["Row"]>;
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["chat_conversations"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["chat_conversations"]["Row"]
        >;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: ChatRole;
          content: string;
          tokens: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["chat_messages"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_user_context: {
        Args: {
          p_user_id: string;
          p_query_embedding: number[];
          p_match_count: number;
        };
        Returns: Array<{
          source: string;
          ref_id: string;
          content: string;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
  };
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  strategic_thinking: "Strategic Thinking",
  finance_pl: "Finance & P&L",
  lead_gen: "Lead Generation",
  brand: "Brand & Positioning",
  leadership: "Leadership",
  exec_comm: "Executive Communication",
  ai_marketing: "AI-Powered Marketing",
  lifestyle: "Lifestyle Discipline",
};

export const SKILL_KEYS: SkillKey[] = [
  "strategic_thinking",
  "finance_pl",
  "lead_gen",
  "brand",
  "leadership",
  "exec_comm",
  "ai_marketing",
  "lifestyle",
];
