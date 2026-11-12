import type { Metadata } from "next";
import Link from "next/link";

import { RecoverForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Recuperá tu contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Ingresá tu email y te enviamos un enlace para elegir una nueva.
      </p>
      <RecoverForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:text-brand-bright">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
