import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "./supabase/server";

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "hardwig@gmail.com"
).toLowerCase();

export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL;
}

export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return null;
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}
