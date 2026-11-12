import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Creá tu cuenta</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Gratis, sin tarjeta. En dos minutos tenés tu comercio funcionando.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-brand hover:text-brand-bright">
          Iniciá sesión
        </Link>
      </p>
    </>
  );
}
