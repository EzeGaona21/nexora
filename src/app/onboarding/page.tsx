import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/auth-forms";
import { Logo } from "@/components/layout/logo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configurá tu comercio" };

export default async function OnboardingPage() {
  if (!isSupabaseConfigured) redirect("/login?error=config");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/dashboard");

  const suggested = (user.user_metadata?.business_name as string | undefined) ?? "";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="backdrop-grid pointer-events-none absolute inset-0" />
      <div className="relative mb-8">
        <Logo />
      </div>
      <div className="card relative w-full max-w-[26rem] p-6 shadow-pop sm:p-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-brand">Último paso</p>
        <h1 className="text-xl font-semibold tracking-tight">Configurá tu comercio</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          Creamos un espacio de trabajo privado: solo vos y las personas que invites van a ver sus datos.
        </p>
        <OnboardingForm defaultName={suggested} />
      </div>
    </div>
  );
}
