"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card">
      <EmptyState
        icon={<TriangleAlert />}
        title="No pudimos cargar esta pantalla"
        description="Puede ser un problema momentáneo de conexión con la base de datos. Tus datos no se modificaron."
        action={<Button onClick={reset}>Reintentar</Button>}
      />
    </div>
  );
}
