"use client";

import { Ban, FileDown, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cancelSale } from "@/actions/sales";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function SaleActions({
  saleId,
  number,
  canCancel,
  cancelHint,
}: {
  saleId: string;
  number: number;
  /** Venta completada y usuario administrador. */
  canCancel: boolean;
  /** Motivo por el que no se puede cancelar, si corresponde mostrarlo. */
  cancelHint: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const result = await cancelSale(saleId);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Venta cancelada. El stock fue devuelto.");
    setOpen(false);
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a
        href={`/api/ventas/${saleId}/comprobante`}
        target="_blank"
        rel="noopener"
        className={buttonVariants({ variant: "secondary" })}
      >
        <FileDown aria-hidden />
        Descargar PDF
      </a>
      <Button variant="ghost" onClick={() => window.print()}>
        <Printer aria-hidden />
        Imprimir
      </Button>
      {canCancel ? (
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Ban aria-hidden />
          Cancelar venta
        </Button>
      ) : cancelHint ? (
        <span className="text-xs text-subtle">{cancelHint}</span>
      ) : null}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Cancelar venta #${String(number).padStart(6, "0")}`}
        description="Las unidades vuelven al stock y la venta deja de contar en los indicadores. No se puede deshacer."
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Volver
          </Button>
          <Button variant="danger" loading={busy} onClick={confirm}>
            Sí, cancelar venta
          </Button>
        </div>
      </Modal>
    </div>
  );
}
