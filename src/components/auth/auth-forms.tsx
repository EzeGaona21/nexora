"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  createOrganization,
  login,
  register as registerAccount,
  requestPasswordReset,
  updatePassword,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { BUSINESS_TYPES } from "@/lib/format";
import { transitions } from "@/lib/motion";
import {
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

function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={transitions.fast}
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function Sent({ title, children }: { title: string; children: string }) {
  return (
    <motion.div
      className="flex flex-col items-center py-4 text-center"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.base}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
      <Link href="/login" className="mt-6 text-sm font-medium text-brand hover:text-brand-bright">
        Volver a iniciar sesión
      </Link>
    </motion.div>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [error, setError] = useState<string | null>(notice ?? null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await login(values, next);
    if (result && !result.ok) setError(result.error);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Email" error={errors.email?.message}>
        {(a) => (
          <Input type="email" autoComplete="email" placeholder="vos@tucomercio.com" {...a} {...form.register("email")} />
        )}
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        {(a) => (
          <Input type="password" autoComplete="current-password" {...a} {...form.register("password")} />
        )}
      </Field>
      <Link href="/recuperar" className="-mt-1 self-end text-[13px] text-muted hover:text-fg">
        ¿Olvidaste tu contraseña?
      </Link>
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Iniciar sesión
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", businessName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await registerAccount(values);
    if (!result) return;
    if (!result.ok) setError(result.error);
    else setSent(true);
  });

  if (sent) {
    return (
      <Sent title="Revisá tu email">
        Te enviamos un enlace para confirmar tu cuenta. Al abrirlo vas a terminar de configurar tu comercio.
      </Sent>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Tu nombre" error={errors.fullName?.message}>
        {(a) => <Input autoComplete="name" {...a} {...form.register("fullName")} />}
      </Field>
      <Field label="Nombre del comercio" error={errors.businessName?.message}>
        {(a) => <Input autoComplete="organization" placeholder="Ej.: Almacén El Ceibo" {...a} {...form.register("businessName")} />}
      </Field>
      <Field label="Email" error={errors.email?.message}>
        {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
      </Field>
      <Field
        label="Contraseña"
        error={errors.password?.message}
        hint="Mínimo 8 caracteres, con letras y números."
      >
        {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("password")} />}
      </Field>
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Crear cuenta gratis
      </Button>
    </form>
  );
}

export function RecoverForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<RecoverInput>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) setError(result.error);
    else setSent(true);
  });

  if (sent) {
    return (
      <Sent title="Revisá tu email">
        Si el email está registrado, en unos minutos vas a recibir un enlace para elegir una nueva contraseña.
      </Sent>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Email" error={errors.email?.message}>
        {(a) => <Input type="email" autoComplete="email" {...a} {...form.register("email")} />}
      </Field>
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Enviar enlace
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await updatePassword(values);
    if (result && !result.ok) setError(result.error);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Nueva contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres, con letras y números.">
        {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("password")} />}
      </Field>
      <Field label="Repetir contraseña" error={errors.confirm?.message}>
        {(a) => <Input type="password" autoComplete="new-password" {...a} {...form.register("confirm")} />}
      </Field>
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Guardar contraseña
      </Button>
    </form>
  );
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { businessName: defaultName, businessType: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await createOrganization(values);
    if (result && !result.ok) setError(result.error);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <Field label="Nombre del comercio" error={errors.businessName?.message}>
        {(a) => <Input autoComplete="organization" {...a} {...form.register("businessName")} />}
      </Field>
      <Field label="Rubro" error={errors.businessType?.message}>
        {(a) => (
          <Select {...a} {...form.register("businessType")}>
            <option value="" disabled>
              Elegí un rubro
            </option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Crear mi espacio de trabajo
      </Button>
    </form>
  );
}
