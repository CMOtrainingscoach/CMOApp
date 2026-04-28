import "server-only";
import { cache } from "react";
import { createClient, createServiceRoleClient } from "./supabase/server";
import {
  PROFESSOR_CONFIG_FALLBACK,
  type ProfessorConfig,
} from "./professor-config";

async function fetchConfig(useServiceRole: boolean): Promise<ProfessorConfig> {
  try {
    const supabase = useServiceRole
      ? createServiceRoleClient()
      : await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!data) return PROFESSOR_CONFIG_FALLBACK;
    return {
      professor_name:
        data.professor_name ?? PROFESSOR_CONFIG_FALLBACK.professor_name,
      professor_avatar_url: data.professor_avatar_url ?? null,
      professor_persona:
        data.professor_persona ?? PROFESSOR_CONFIG_FALLBACK.professor_persona,
      professor_traits:
        data.professor_traits ?? PROFESSOR_CONFIG_FALLBACK.professor_traits,
      professor_response_length:
        data.professor_response_length ??
        PROFESSOR_CONFIG_FALLBACK.professor_response_length,
      professor_language:
        data.professor_language ?? PROFESSOR_CONFIG_FALLBACK.professor_language,
      professor_extra_notes: data.professor_extra_notes ?? null,
      professor_system_prompt_override:
        data.professor_system_prompt_override ?? null,
      updated_at: data.updated_at ?? PROFESSOR_CONFIG_FALLBACK.updated_at,
      updated_by: data.updated_by ?? null,
    };
  } catch {
    return PROFESSOR_CONFIG_FALLBACK;
  }
}

export const getProfessorConfig = cache(() => fetchConfig(false));
export const getProfessorConfigAdmin = () => fetchConfig(true);
