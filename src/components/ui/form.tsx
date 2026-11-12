import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const controlBase = [
  "h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg",
  "placeholder:text-subtle",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border-strong",
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20",
];

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlBase,
        "select-chevron cursor-pointer appearance-none pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("text-[13px] font-medium text-muted", className)} {...props} />
  );
}

/**
 * Campo con etiqueta, ayuda y error accesibles.
 * `children` recibe los atributos que conectan el control con su etiqueta.
 */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
