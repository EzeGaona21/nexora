"use server";

import { redirect } from "next/navigation";

import { dbErrorMessage } from "@/lib/auth/session";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";
import {
  firstIssue,
  loginSchema,
  newPasswordSchema,
  onboardingSchema,
  recoverSchema,
  registerSchema,
  type LoginInput,
  type NewPasswordInput,
  type OnboardingInput,
  type RecoverInput,
  type RegisterInput,
} from "@/lib/validations/schemas";

const NOT_CONFIGURED =
  "Falta configurar Supabase. Completá .env.local siguiendo el README y reiniciá el servidor.";

/** Solo rutas internas: evita redirecciones abiertas (?next=https://sitio-malicioso). */
function safeNext(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/dashboard";
  }
  return next;
}

export async function login(input: LoginInput, next?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Todavía no confirmaste tu email. Revisá tu casilla." };
    }
    // Mensaje único: no revela si el email existe.
    return { ok: false, error: "Email o contraseña incorrectos." };
  }
  redirect(safeNext(next));
}

export async function register(
  input: RegisterInput,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
      data: {
        full_name: parsed.data.fullName,
        business_name: parsed.data.businessName,
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, error: "Elegí una contraseña más segura." };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { ok: false, error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." };
    }
    return { ok: false, error: "No pudimos crear la cuenta. Probá de nuevo." };
  }
  // Con confirmación por email desactivada, la sesión ya está activa.
  if (data.session) redirect("/onboarding");
  return { ok: true, data: { needsConfirmation: true } };
}

export async function requestPasswordReset(input: RecoverInput): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = recoverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/actualizar-clave`,
  });
  // Siempre responde igual: no revela si el email está registrado.
  return { ok: true };
}

export async function updatePassword(input: NewPasswordInput): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "same_password"
          ? "La nueva contraseña debe ser distinta a la anterior."
          : "No pudimos actualizar la contraseña. Pedí un nuevo enlace.",
    };
  }
  redirect("/dashboard");
}

export async function signOut(formData?: FormData): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const next = formData?.get("next");
  redirect(next === "/registro" ? "/registro" : "/");
}

/** "Explorar demo": inicia sesión con el usuario de demostración (solo lectura). */
export async function enterDemo(): Promise<void> {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!isSupabaseConfigured || !email || !password) redirect("/login?error=demo");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=demo");
  redirect("/dashboard");
}

export async function createOrganization(input: OnboardingInput): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.businessName,
    p_business_type: parsed.data.businessType,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  redirect("/dashboard");
}
