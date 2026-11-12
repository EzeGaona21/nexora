import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GrowBar, Stagger, StaggerItem } from "@/components/motion/primitives";
import { OrganizationForm } from "@/components/settings/settings-forms";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";
import { formatARS, formatNumber } from "@/lib/format";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Configuración" };

function Usage({ label, used, limit, suffix }: { label: string; used: number; limit: number | null; suffix?: string }) {
  const ratio = limit ? Math.min(1, used / limit) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="num text-fg">
          {formatNumber(used)}
          <span className="text-subtle"> / {limit === null ? "sin límite" : formatNumber(limit)}</span>
          {suffix ? <span className="ml-1 font-sans text-xs text-subtle">{suffix}</span> : null}
        </span>
      </div>
      {limit === null ? (
        <div className="h-1.5 rounded-full bg-raised" />
      ) : (
        <GrowBar ratio={ratio} className={ratio >= 0.9 ? "bg-warning" : undefined} />
      )}
    </div>
  );
}

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  const plan = getPlan(ctx.org.plan);

  const [productsRes, membersRes, invitationsRes, quotaRes] = await Promise.all([
    ctx.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.org.id)
      .eq("is_active", true),
    ctx.supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    ctx.supabase.from("invitations").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id),
    ctx.supabase.rpc("ai_quota", { p_org: ctx.org.id }),
  ]);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (quotaRes.error) throw new Error(quotaRes.error.message);
  const quota = (Array.isArray(quotaRes.data) ? quotaRes.data[0] : quotaRes.data) as
    | { used: number; quota: number; per_day: boolean }
    | undefined;

  return (
    <>
      <PageHeader title="Configuración" description="Datos del comercio, plan y límites de uso." />

      <Stagger className="flex max-w-3xl flex-col gap-4">
        <StaggerItem>
          <Card>
            <CardHeader title="Comercio" description="Cómo se identifica tu negocio dentro de NEXORA." />
            <div className="p-5">
              <OrganizationForm
                defaults={{ businessName: ctx.org.name, businessType: ctx.org.business_type }}
                canEdit={ctx.isAdmin}
                readOnlyReason={
                  ctx.isAdmin
                    ? null
                    : ctx.org.is_demo
                      ? "La demo es de solo lectura."
                      : "Solo un administrador puede cambiar estos datos."
                }
              />
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader
              title="Plan y uso"
              description={plan.tagline}
              action={
                <Badge tone="brand">
                  {plan.name}
                  {plan.priceARS > 0 ? <span className="num"> · {formatARS(plan.priceARS)}/mes</span> : null}
                </Badge>
              }
            />
            <div className="flex flex-col gap-5 p-5">
              <Usage label="Productos activos" used={productsRes.count ?? 0} limit={plan.limits.products} />
              <Usage
                label="Usuarios (incluye invitaciones)"
                used={(membersRes.count ?? 0) + (invitationsRes.count ?? 0)}
                limit={plan.limits.users}
              />
              <Usage
                label="Consultas a NEXORA AI"
                used={Number(quota?.used ?? 0)}
                limit={Number(quota?.quota ?? 0)}
                suffix={quota?.per_day ? "hoy" : "este mes"}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="max-w-md text-[13px] text-subtle">
                  Los cobros en línea todavía no están habilitados: para cambiar de plan escribinos y lo activamos a mano.
                </p>
                <Link href="/precios" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Comparar planes
                  <ArrowUpRight aria-hidden />
                </Link>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader title="Tus datos" description="La información del comercio es tuya: podés llevártela cuando quieras." />
            <div className="flex flex-wrap gap-2 p-5">
              <Link href="/reportes?tipo=ventas&rango=90" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Exportar ventas
              </Link>
              <Link href="/reportes?tipo=inventario" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Exportar inventario
              </Link>
              <Link href="/reportes?tipo=gastos&rango=90" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Exportar gastos
              </Link>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>
    </>
  );
}
