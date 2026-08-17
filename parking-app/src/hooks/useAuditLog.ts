import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * Every meaningful write in the app should call logAction() so the
 * `logs` table stays a complete audit trail without each screen having
 * to remember to do it inline.
 */
export function useAuditLog() {
  const { profile } = useAuth();

  async function logAction(action: string, description?: string) {
    if (!profile) return;
    const { error } = await (supabase.from("logs") as any).insert({
      user_id: profile.id,
      action,
      description: description ?? null,
    });
    if (error) console.warn("[audit log] failed:", error.message);
  }

  return { logAction };
}
