"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, Trash2, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { cancelInvitation, inviteMember, removeMember, updateMemberRole } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listItem } from "@/lib/motion";
import { inviteSchema, type InviteInput } from "@/lib/validations/schemas";

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "employee" | "demo";
  joinedAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "employee";
}

const ROLE_LABEL = { admin: "Administrador", employee: "Empleado", demo: "Visitante" } as const;

function InviteForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "employee" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await inviteMember(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Invitación registrada");
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <Field label="Email de la persona" error={errors.email?.message}>
        {(a) => <Input type="email" autoComplete="off" placeholder="nombre@ejemplo.com" {...a} {...form.register("email")} />}
      </Field>
      <Field
        label="Rol"
        error={errors.role?.message}
        hint="Empleado: registra ventas, productos y gastos. Administrador: además cancela ventas y gestiona el equipo."
      >
        {(a) => (
          <Select {...a} {...form.register("role")}>
            <option value="employee">Empleado</option>
            <option value="admin">Administrador</option>
          </Select>
        )}
      </Field>
      <p className="text-[13px] text-subtle">
        Pedile que se registre en NEXORA con ese mismo email: al confirmar su cuenta entra directo a este comercio.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Invitar
        </Button>
      </div>
    </form>
  );
}

export function TeamView({
  members,
  invitations,
  currentUserId,
  isAdmin,
  seats,
  planName,
}: {
  members: TeamMember[];
  invitations: PendingInvitation[];
  currentUserId: string;
  isAdmin: boolean;
  /** Lugares usados (integrantes + invitaciones) y tope del plan. */
  seats: { used: number; limit: number | null };
  planName: string;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);
  const [pending, startTransition] = useTransition();
  const full = seats.limit !== null && seats.used >= seats.limit;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? "No pudimos completar la operación.");
      else toast.success(success);
    });

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Quiénes pueden entrar a este comercio y qué puede hacer cada uno."
        actions={
          isAdmin ? (
            <Button onClick={() => setInviteOpen(true)} disabled={full}>
              <UserPlus aria-hidden />
              Invitar persona
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
        <p className="text-sm text-muted">
          Plan <span className="font-medium text-fg">{planName}</span> ·{" "}
          <span className="num text-fg">{seats.used}</span>
          {seats.limit !== null ? (
            <>
              {" "}
              de <span className="num text-fg">{seats.limit}</span>
            </>
          ) : null}{" "}
          {seats.limit === 1 ? "usuario" : "usuarios"}
        </p>
        {full ? (
          <a href="/precios" className="text-sm font-medium text-brand-bright underline-offset-4 hover:underline">
            Sumar más usuarios
          </a>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Integrantes" />
        <ul className="mt-3 divide-y divide-border/60">
          <AnimatePresence initial={false}>
            {members.map((m) => {
              const self = m.userId === currentUserId;
              return (
                <motion.li
                  key={m.userId}
                  layout
                  variants={listItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-deep text-sm font-semibold text-brand-bright"
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {m.name}
                      {self ? <span className="ml-2 text-xs font-normal text-subtle">(vos)</span> : null}
                    </p>
                    <p className="truncate text-[13px] text-muted">{m.email}</p>
                  </div>
                  {isAdmin && !self && m.role !== "demo" ? (
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`role-${m.userId}`}>
                        Rol de {m.name}
                      </label>
                      <Select
                        id={`role-${m.userId}`}
                        className="h-9 w-40"
                        value={m.role}
                        disabled={pending}
                        onChange={(e) =>
                          run(
                            () => updateMemberRole(m.userId, e.target.value as "admin" | "employee"),
                            "Rol actualizado",
                          )
                        }
                      >
                        <option value="employee">Empleado</option>
                        <option value="admin">Administrador</option>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToRemove(m)}
                        aria-label={`Quitar a ${m.name} del equipo`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ) : (
                    <Badge tone={m.role === "admin" ? "brand" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </Card>

      {isAdmin ? (
        <Card className="mt-4">
          <CardHeader title="Invitaciones pendientes" description="Se activan cuando la persona confirma su cuenta con ese email." />
          {invitations.length === 0 ? (
            <EmptyState
              icon={<MailPlus />}
              title="No hay invitaciones pendientes"
              description="Invitá a quien atiende el local para que registre ventas con su propio usuario."
              className="py-10"
            />
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {invitations.map((inv) => (
                  <motion.li
                    key={inv.id}
                    layout
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm text-fg">{inv.email}</p>
                    <Badge>{ROLE_LABEL[inv.role]}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => cancelInvitation(inv.id), "Invitación cancelada")}
                    >
                      Cancelar
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-subtle">
          <Users className="size-4" aria-hidden />
          Solo un administrador puede invitar personas o cambiar roles.
        </p>
      )}

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invitar al equipo"
        description="Cada persona entra con su propio usuario y contraseña."
      >
        <InviteForm onDone={() => setInviteOpen(false)} />
      </Modal>

      <Modal
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title={`Quitar a ${toRemove?.name ?? ""}`}
        description="Deja de tener acceso a este comercio de inmediato. Las ventas que registró se conservan."
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToRemove(null)}>
            Volver
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() => {
              const target = toRemove;
              if (!target) return;
              run(() => removeMember(target.userId), "Persona quitada del equipo");
              setToRemove(null);
            }}
          >
            Sí, quitar acceso
          </Button>
        </div>
      </Modal>
    </>
  );
}
