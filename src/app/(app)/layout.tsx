import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getSessionContext } from "@/lib/auth/session";

// Todo lo que cuelga de (app) depende de la sesión: nunca se prerenderiza.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext();

  const { count } = await ctx.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("is_active", true)
    .eq("is_low_stock", true);

  return (
    <AppShell
      orgName={ctx.org.name}
      userName={ctx.user.name}
      userEmail={ctx.user.email}
      role={ctx.role}
      isDemo={ctx.org.is_demo}
      stockAlerts={count ?? 0}
    >
      {children}
    </AppShell>
  );
}
