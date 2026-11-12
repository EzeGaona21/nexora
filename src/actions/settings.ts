"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { BUSINESS_TYPES } from "@/lib/format";
import { DEMO_READONLY_MESSAGE, type ActionResult } from "@/lib/utils";
import {
  changePasswordSchema,
  firstIssue,
  orgSettingsSchema,
  profileSchema,
  type ChangePasswordInput,
  type OrgSettingsInput,
  type ProfileInput,
} from "@/lib/validations/schemas";

export async function updateOrganization(input: OrgSettingsInput): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };
  if (!ctx.isAdmin) return { ok: false, error: "Solo un administrador puede cambiar los datos del comercio." };

  const parsed = orgSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (!BUSINESS_TYPES.some((b) => b.value === parsed.data.businessType)) {
    return { ok: false, error: "Elegí un rubro de la lista." };
  }

  const { error } = await ctx.supabase
    .from("organizations")
    .update({ name: parsed.data.businessName, business_type: parsed.data.businessType })
    .eq("id", ctx.org.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", ctx.user.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  // El nombre que muestra la app sale de los metadatos de la sesión.
  const { error: authError } = await ctx.supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });
  if (authError) return { ok: false, error: "No pudimos actualizar tu nombre. Probá de nuevo." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const ctx = await getSessionContext();
  // La cuenta de demostración es compartida: su clave no se puede cambiar.
  if (!ctx.canWrite) return { ok: false, error: DEMO_READONLY_MESSAGE };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  // Se exige la clave actual: una sesión abierta en otra máquina no alcanza.
  const { error: verifyError } = await ctx.supabase.auth.signInWithPassword({
    email: ctx.user.email,
    password: parsed.data.current,
  });
  if (verifyError) return { ok: false, error: "La contraseña actual no es correcta." };

  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "same_password"
          ? "La nueva contraseña debe ser distinta a la actual."
          : "No pudimos actualizar la contraseña. Probá de nuevo.",
    };
  }
  return { ok: true };
}
