import { LogOut } from "lucide-react";
import type { Metadata } from "next";

import { signOut } from "@/actions/auth";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { getSessionContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Perfil" };

const ROLE_LABEL = { admin: "Administrador", employee: "Empleado", demo: "Visitante de la demo" } as const;

export default async function ProfilePage() {
  const ctx = await getSessionContext();
  const isDemo = !ctx.canWrite;

  return (
    <>
      <PageHeader title="Perfil" description="Tus datos personales y de acceso." />

      <Stagger className="flex max-w-3xl flex-col gap-4">
        <StaggerItem>
          <Card>
            <CardHeader
              title="Datos personales"
              description={`Tu rol en ${ctx.org.name}`}
              action={<Badge tone={ctx.isAdmin ? "brand" : "neutral"}>{ROLE_LABEL[ctx.role]}</Badge>}
            />
            <div className="p-5">
              <ProfileForm
                defaults={{ fullName: ctx.user.name }}
                email={isDemo ? "Cuenta de demostración" : ctx.user.email}
                canEdit={!isDemo}
              />
            </div>
          </Card>
        </StaggerItem>

        {isDemo ? null : (
          <StaggerItem>
            <Card>
              <CardHeader title="Contraseña" description="Te pedimos la actual para confirmar que sos vos." />
              <div className="p-5">
                <PasswordForm />
              </div>
            </Card>
          </StaggerItem>
        )}

        <StaggerItem>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-fg">Sesión</h2>
              <p className="mt-0.5 text-[13px] text-muted">Cerrá la sesión en este dispositivo.</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                <LogOut aria-hidden />
                Cerrar sesión
              </Button>
            </form>
          </Card>
        </StaggerItem>
      </Stagger>
    </>
  );
}
