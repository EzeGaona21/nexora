import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Organization } from "@/types/db";

export interface SessionContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string; name: string };
  org: Organization;
  role: MemberRole;
  /** admin o employee. El rol demo es de solo lectura. */
  canWrite: boolean;
  isAdmin: boolean;
}

/**
 * Sesión + comercio activo. `cache` la resuelve una sola vez por request.
 * El comercio SIEMPRE sale de la membresía verificada en la base, nunca de
 * un parámetro enviado por el cliente; RLS vuelve a validarlo en cada consulta.
 */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  if (!isSupabaseConfigured) redirect("/login?error=config");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const loadMembership = async () => {
    const { data } = await supabase
      .from("memberships")
      .select("role, organizations (id, name, business_type, plan, is_demo)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  };

  let membership = await loadMembership();
  if (!membership) {
    // Sin comercio todavía: si alguien lo invitó a un equipo, se suma ahora.
    const { data: accepted } = await supabase.rpc("accept_invitations");
    if (typeof accepted === "number" && accepted > 0) membership = await loadMembership();
  }

  const org = membership?.organizations as unknown as Organization | null | undefined;
  if (!membership || !org) redirect("/onboarding");

  const role = membership.role as MemberRole;
  const metaName = (user.user_metadata?.full_name as string | undefined)?.trim();

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email ?? "",
      name: metaName || (user.email ?? "").split("@")[0] || "Usuario",
    },
    org,
    role,
    canWrite: role === "admin" || role === "employee",
    isAdmin: role === "admin",
  };
});

/** Traduce errores de Postgres/Supabase a mensajes para el usuario. */
export function dbErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return "Ocurrió un error inesperado.";
  if (error.code === "23505") return "Ya existe un registro con esos datos.";
  if (error.code === "42501") return "No tenés permisos para realizar esta acción.";
  if (error.code === "23514") return "Alguno de los valores está fuera de rango.";
  // Las funciones de NEXORA lanzan mensajes ya redactados para el usuario (P0001).
  if (error.code === "P0001" && error.message) return error.message;
  return "No pudimos completar la operación. Probá de nuevo.";
}
