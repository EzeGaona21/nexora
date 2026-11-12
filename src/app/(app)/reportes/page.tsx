import { FileSpreadsheet, FileText, Inbox } from "lucide-react";
import type { Metadata } from "next";

import { Reveal } from "@/components/motion/primitives";
import { ReportTabs } from "@/components/reports/report-tabs";
import { buttonVariants } from "@/components/ui/button";
import { PeriodFilter } from "@/components/ui/period-filter";
import { Card, EmptyState, PageHeader, TableShell, td, th } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";
import { todayAR } from "@/lib/dates";
import { resolvePeriod } from "@/lib/period";
import { buildReport } from "@/lib/reports/build";
import { formatCell, isNumericKind } from "@/lib/reports/cells";
import { isReportType, REPORT_META, type ReportType } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportes" };

const PREVIEW_ROWS = 40;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; rango?: string; desde?: string; hasta?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  const today = todayAR();
  const type: ReportType = isReportType(params.tipo ?? "") ? (params.tipo as ReportType) : "ventas";
  const meta = REPORT_META[type];
  const period = resolvePeriod(params, today);
  const report = await buildReport(ctx, type, period, today);

  // El período viaja igual en las pestañas y en las descargas.
  const periodQuery =
    period.preset === "custom" ? `desde=${period.from}&hasta=${period.to}` : `rango=${period.preset}`;
  const download = (format: "csv" | "pdf") => `/api/reportes/${type}?formato=${format}&${periodQuery}`;
  const hasRows = report.rows.length > 0;

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Los mismos números que ves en pantalla, listos para exportar."
        actions={
          hasRows ? (
            <>
              <a href={download("csv")} className={buttonVariants({ variant: "secondary" })} download>
                <FileSpreadsheet aria-hidden />
                CSV
              </a>
              <a href={download("pdf")} className={buttonVariants()} download>
                <FileText aria-hidden />
                PDF
              </a>
            </>
          ) : null
        }
      />

      <ReportTabs active={type} query={periodQuery} />

      <div className="my-5 flex flex-col gap-4">
        <p className="text-sm text-muted">{meta.description}</p>
        {meta.usesPeriod ? (
          <PeriodFilter period={period} today={today} extraParams={{ tipo: type }} />
        ) : (
          <p className="text-[13px] text-subtle">Este reporte muestra la situación actual: no depende del período.</p>
        )}
      </div>

      <Reveal key={`${type}-${periodQuery}`}>
        {report.summary.length > 0 ? (
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {report.summary.map((s) => (
              <Card key={s.label} className="p-4 sm:p-5">
                <dt className="truncate text-[13px] text-muted" title={s.label}>
                  {s.label}
                </dt>
                <dd className="num mt-2 truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                  {formatCell(s.value, s.kind)}
                </dd>
              </Card>
            ))}
          </dl>
        ) : null}

        <Card className="overflow-hidden">
          {hasRows ? (
            <>
              <TableShell>
                <thead>
                  <tr className="border-b border-border">
                    {report.columns.map((c) => (
                      <th key={c.key} className={cn(th, isNumericKind(c.kind) && "text-right")}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="border-b border-border/60 transition-colors hover:bg-raised/40">
                      {report.columns.map((c, ci) => {
                        const value = row[c.key] ?? null;
                        return (
                          <td
                            key={c.key}
                            className={cn(
                              td,
                              isNumericKind(c.kind) && "num text-right",
                              c.kind === "date" && "num whitespace-nowrap",
                              ci > 0 && !isNumericKind(c.kind) && "text-muted",
                              typeof value === "number" && value < 0 && "text-danger",
                            )}
                          >
                            <span className={cn(c.kind === "text" && "block max-w-[18rem] truncate")}>
                              {formatCell(value, c.kind)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {report.totals ? (
                  <tfoot>
                    <tr className="border-t border-border-strong bg-raised/40">
                      {report.columns.map((c, ci) => (
                        <td key={c.key} className={cn(td, "font-semibold", isNumericKind(c.kind) && "num text-right")}>
                          {ci === 0 ? "Total" : c.key in report.totals! ? formatCell(report.totals![c.key], c.kind) : ""}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                ) : null}
              </TableShell>
              {report.rows.length > PREVIEW_ROWS ? (
                <p className="border-t border-border px-5 py-3 text-xs text-subtle">
                  Vista previa de {PREVIEW_ROWS} de {report.rows.length} filas. El total considera todas; exportá para ver el
                  detalle completo.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={<Inbox />}
              title="Sin registros para este reporte"
              description="No hay datos en el período elegido. Probá con un rango de fechas más amplio."
            />
          )}
        </Card>
      </Reveal>
    </>
  );
}
