import type { Metadata } from "next";

import { NewPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Ruta protegida por el proxy: solo se llega con la sesión del enlace de recuperación.
export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Elegí una nueva contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Vas a usarla la próxima vez que inicies sesión.</p>
      <NewPasswordForm />
    </>
  );
}
