"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePassword, updateOrganization, updateProfile } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { BUSINESS_TYPES } from "@/lib/format";
import { transitions } from "@/lib/motion";
import {
  changePasswordSchema,
  orgSettingsSchema,
  profileSchema,
  type ChangePasswordInput,
  type OrgSettingsInput,
  type ProfileInput,
} from "@/lib/validations/schemas";

function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={transitions.base}
          className="overflow-hidden rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export function OrganizationForm({
  defaults,
  canEdit,
  readOnlyReason,
}: {
  defaults: OrgSettingsInput;
  canEdit: boolean;
  readOnlyReason: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<OrgSettingsInput>({ resolver: zodResolver(orgSettingsSchema), defaultValues: defaults });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updateOrganization(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Datos del comercio actualizados");
    form.reset(values);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del comercio" error={errors.businessName?.message}>
          {(a) => <Input disabled={!canEdit} autoComplete="organization" {...a} {...form.register("businessName")} />}
        </Field>
        <Field label="Rubro" error={errors.businessType?.message}>
          {(a) => (
            <Select disabled={!canEdit} {...a} {...form.register("businessType")}>
              {BUSINESS_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-subtle">{readOnlyReason ?? "El nombre aparece en los comprobantes y reportes."}</p>
        {canEdit ? (
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Guardar cambios
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ProfileForm({ defaults, email, canEdit }: { defaults: ProfileInput; email: string; canEdit: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updateProfile(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Perfil actualizado");
    form.reset(values);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" error={errors.fullName?.message}>
          {(a) => <Input disabled={!canEdit} autoComplete="name" {...a} {...form.register("fullName")} />}
        </Field>
        <Field label="Email" hint="El email es tu identificador de acceso y no se puede cambiar desde acá.">
          {(a) => <Input value={email} readOnly disabled {...a} />}
        </Field>
      </div>
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await changePassword(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Contraseña actualizada");
    form.reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Contraseña actual" error={errors.current?.message} className="sm:max-w-sm">
        {(a) => <Input type="password" autoComplete="current-password" {...a} {...form.register("current")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números.">
          {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("password")} />}
        </Field>
        <Field label="Repetir nueva contraseña" error={errors.confirm?.message}>
          {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("confirm")} />}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
