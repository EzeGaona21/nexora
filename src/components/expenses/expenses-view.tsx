"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createExpense, deleteExpense } from "@/actions/expenses";
import { AnimatedNumber, GrowBar } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge, Card, CardHeader, EmptyState, PageHeader, TableShell, td, th } from "@/components/ui/primitives";
import {
  EXPENSE_CATEGORIES,
  formatARS,
  formatDay,
  PAYMENT_METHODS,
  paymentLabel,
} from "@/lib/format";
import { listItem } from "@/lib/motion";
import { cn, DEMO_READONLY_MESSAGE } from "@/lib/utils";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/schemas";
import type { ExpenseRow } from "@/types/db";

function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ExpenseForm({ today, onDone }: { today: string; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: Number.NaN,
      expenseDate: today,
      paymentMethod: "transferencia",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await createExpense(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Gasto registrado");
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4" noValidate>
      {error ? (
        <p role="alert" className="col-span-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <Field label="Categoría" error={errors.category?.message}>
        {(a) => (
          <Select {...a} {...form.register("category")}>
            <option value="" disabled>
              Elegí una categoría
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Importe ($)" error={errors.amount?.message}>
        {(a) => (
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            className="num"
            {...a}
            {...form.register("amount", { valueAsNumber: true })}
          />
        )}
      </Field>
      <Field label="Descripción" error={errors.description?.message} className="col-span-2">
        {(a) => <Input placeholder="Ej.: Factura de luz de octubre" {...a} {...form.register("description")} />}
      </Field>
      <Field label="Fecha" error={errors.expenseDate?.message}>
        {(a) => <Input type="date" max={today} className="num" {...a} {...form.register("expenseDate")} />}
      </Field>
      <Field label="Método de pago" error={errors.paymentMethod?.message}>
        {(a) => (
          <Select {...a} {...form.register("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="col-span-2 mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Registrar gasto
        </Button>
      </div>
    </form>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 truncate text-xl font-semibold tracking-tight sm:text-2xl",
          tone === "good" && "text-success",
          tone === "bad" && "text-danger",
        )}
      >
        <AnimatedNumber value={value} format="ars" />
      </p>
    </Card>
  );
}

export function ExpensesView({
  expenses,
  month,
  months,
  today,
  revenue,
  cost,
  canWrite,
  isAdmin,
}: {
  expenses: ExpenseRow[];
  month: string;
  months: string[];
  today: string;
  revenue: number;
  cost: number;
  canWrite: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const net = revenue - cost - totalExpenses;

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxCategory = byCategory[0]?.[1] ?? 0;

  function openCreate() {
    if (!canWrite) {
      toast.info(DEMO_READONLY_MESSAGE);
      return;
    }
    setCreating(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await deleteExpense(deleting.id);
    setDeleteBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Gasto eliminado");
    setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title="Gastos"
        description="Registrá los egresos del negocio y mirá el resultado del mes."
        actions={
          <>
            <Select
              value={month}
              onChange={(e) => startTransition(() => router.replace(`/gastos?mes=${e.target.value}`))}
              aria-label="Mes"
              className="w-44"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              Nuevo gasto
            </Button>
          </>
        }
      />

      <div className={cn("transition-opacity duration-150", isPending && "opacity-50")}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat label="Ingresos por ventas" value={revenue} />
          <Stat label="Costo de mercadería" value={cost} />
          <Stat label="Gastos del mes" value={totalExpenses} />
          <Stat label="Resultado neto estimado" value={net} tone={net < 0 ? "bad" : "good"} />
        </div>
        <p className="mt-2 text-xs text-subtle">
          Resultado neto = ingresos − costo de la mercadería vendida − gastos registrados. Es una
          estimación de gestión, no un balance contable.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={monthLabel(month)} description={`${expenses.length} ${expenses.length === 1 ? "gasto registrado" : "gastos registrados"}`} />
            {expenses.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Sin gastos en este mes"
                description="Registrá alquiler, servicios, sueldos e impuestos para conocer tu resultado real."
                action={
                  <Button onClick={openCreate}>
                    <Plus aria-hidden />
                    Nuevo gasto
                  </Button>
                }
              />
            ) : (
              <div className="mt-4">
                <TableShell>
                  <thead>
                    <tr className="border-y border-border">
                      <th scope="col" className={th}>Fecha</th>
                      <th scope="col" className={th}>Descripción</th>
                      <th scope="col" className={th}>Categoría</th>
                      <th scope="col" className={th}>Pago</th>
                      <th scope="col" className={cn(th, "text-right")}>Importe</th>
                      {isAdmin ? (
                        <th scope="col" className={th}>
                          <span className="sr-only">Acciones</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {expenses.map((e) => (
                        <motion.tr
                          key={e.id}
                          layout="position"
                          variants={listItem}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="border-b border-border transition-colors last:border-0 hover:bg-raised/50"
                        >
                          <td className={cn(td, "num whitespace-nowrap text-muted")}>{formatDay(e.expense_date)}</td>
                          <td className={cn(td, "max-w-64 truncate")}>{e.description}</td>
                          <td className={td}>
                            <Badge>{e.category}</Badge>
                          </td>
                          <td className={cn(td, "whitespace-nowrap text-muted")}>{paymentLabel(e.payment_method)}</td>
                          <td className={cn(td, "num text-right")}>{formatARS(e.amount)}</td>
                          {isAdmin ? (
                            <td className={cn(td, "text-right")}>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Eliminar gasto: ${e.description}`}
                                onClick={() => setDeleting(e)}
                              >
                                <Trash2 />
                              </Button>
                            </td>
                          ) : null}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </TableShell>
              </div>
            )}
          </Card>

          <Card className="self-start">
            <CardHeader title="Por categoría" description="Participación en el gasto del mes" />
            {byCategory.length === 0 ? (
              <p className="p-5 text-sm text-muted">Sin datos para este mes.</p>
            ) : (
              <ul className="flex flex-col gap-4 p-5">
                {byCategory.map(([category, amount]) => (
                  <li key={category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm">{category}</span>
                      <span className="num shrink-0 text-[13px] text-muted">
                        {formatARS(amount)} · {Math.round((amount / totalExpenses) * 100)} %
                      </span>
                    </div>
                    <GrowBar ratio={maxCategory > 0 ? amount / maxCategory : 0} className="bg-info" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={creating} onOpenChange={setCreating} title="Nuevo gasto" description="Registrá un egreso del negocio.">
        <ExpenseForm today={today} onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar gasto"
        description="Esta acción no se puede deshacer."
        size="sm"
      >
        <p className="text-sm">
          ¿Eliminar <span className="font-medium">{deleting?.description}</span> por{" "}
          <span className="num">{deleting ? formatARS(deleting.amount) : ""}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={deleteBusy} onClick={confirmDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
}
