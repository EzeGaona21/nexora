import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { todayAR } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { buildReport } from "@/lib/reports/build";
import { reportToCsv } from "@/lib/reports/csv";
import { reportToPdf } from "@/lib/reports/pdf";
import { isReportType } from "@/lib/reports/types";
import type { Organization } from "@/types/db";

export const dynamic = "force-dynamic";

/**
 * Descarga de reportes: /api/reportes/ventas?formato=csv|pdf&desde=…&hasta=…
 * Vuelve a resolver sesión y comercio en el servidor; RLS filtra cada consulta.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!isReportType(tipo)) return NextResponse.json({ error: "Reporte inexistente" }, { status: 404 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("organizations (id, name, business_type, plan, is_demo)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const org = membership?.organizations as unknown as Organization | null | undefined;
  if (!org) return NextResponse.json({ error: "Sin comercio" }, { status: 403 });

  const search = request.nextUrl.searchParams;
  const today = todayAR();
  const period = resolvePeriod(
    {
      rango: search.get("rango") ?? undefined,
      desde: search.get("desde") ?? undefined,
      hasta: search.get("hasta") ?? undefined,
    },
    today,
  );

  try {
    const report = await buildReport({ supabase, org }, tipo, period, today);
    const filename = `nexora-${tipo}-${period.from}-a-${period.to}`;

    if (search.get("formato") === "pdf") {
      const pdf = await reportToPdf(report, formatDateTime(new Date().toISOString()));
      return new NextResponse(new Uint8Array(pdf).buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return new NextResponse(reportToCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No pudimos generar el reporte. Probá de nuevo." }, { status: 500 });
  }
}
