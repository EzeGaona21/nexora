"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { DEMO_READONLY_MESSAGE, type ActionResult } from "@/lib/utils";
import { firstIssue, inviteSchema, type InviteInput } from "@/lib/validations/schemas";

const UUID = /^[0-9a-f-]{36}$/i;
const ADMIN_ONLY = "Solo un administrador puede gestionar el equipo.";

async function adminContext() {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ctx, error: DEMO_READONLY_MESSAGE };
  if (!ctx.isAdmin) return { ctx, error: ADMIN_ONLY };
  return { ctx, error: null };
}

export async function inviteMember(input: InviteInput): Promise<ActionResult> {
  const { ctx, error: denied } = await adminContext();
  if (denied) return { ok: false, error: denied };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  // invite_member valida rol, duplicados y el cupo de usuarios del plan.
  const { error } = await ctx.supabase.rpc("invite_member", {
    p_org: ctx.org.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/equipo");
  return { ok: true };
}

export async function cancelInvitation(id: string): Promise<ActionResult> {
  const { ctx, error: denied } = await adminContext();
  if (denied) return { ok: false, error: denied };
  if (!UUID.test(id)) return { ok: false, error: "Invitación inválida." };

  const { error } = await ctx.supabase.from("invitations").delete().eq("id", id).eq("org_id", ctx.org.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/equipo");
  return { ok: true };
}

export async function updateMemberRole(userId: string, role: "admin" | "employee"): Promise<ActionResult> {
  const { ctx, error: denied } = await adminContext();
  if (denied) return { ok: false, error: denied };
  if (!UUID.test(userId) || (role !== "admin" && role !== "employee")) {
    return { ok: false, error: "Datos inválidos." };
  }
  if (userId === ctx.user.id) return { ok: false, error: "No podés cambiar tu propio rol." };

  const { data, error } = await ctx.supabase
    .from("memberships")
    .update({ role })
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: "No encontramos a esa persona en el equipo." };

  revalidatePath("/equipo");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const { ctx, error: denied } = await adminContext();
  if (denied) return { ok: false, error: denied };
  if (!UUID.test(userId)) return { ok: false, error: "Datos inválidos." };
  if (userId === ctx.user.id) return { ok: false, error: "No podés quitarte a vos mismo del equipo." };

  const { data, error } = await ctx.supabase
    .from("memberships")
    .delete()
    .eq("org_id", ctx.org.id)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: "No encontramos a esa persona en el equipo." };

  revalidatePath("/equipo");
  return { ok: true };
}
