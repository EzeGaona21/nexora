import type { Metadata } from "next";
import Link from "next/link";

import { enterDemo } from "@/actions/auth";
import { LoginForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Iniciar sesión" };

const NOTICES: Record<string, string> = {
  config:
    "Falta configurar Supabase. Completá .env.local siguiendo el README y reiniciá el servidor.",
  demo: "La demo todavía no está configurada en este entorno. Ejecutá npm run seed:demo (ver README).",
  link: "El enlace venció o ya fue usado. Pedí uno nuevo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Iniciá sesión</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Entrá a tu comercio en NEXORA.</p>

      <LoginForm next={next} notice={error ? NOTICES[error] : undefined} />

      <div className="my-5 flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
      </div>

      <form action={enterDemo}>
        <Button type="submit" variant="secondary" className="w-full">
          Explorar demo
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand hover:text-brand-bright">
          Creala gratis
        </Link>
      </p>
    </>
  );
}
