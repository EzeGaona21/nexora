import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="backdrop-grid pointer-events-none absolute inset-0" />
      <Link href="/" className="relative mb-8" aria-label="NEXORA · volver al inicio">
        <Logo />
      </Link>
      <div className="card relative w-full max-w-[26rem] p-6 shadow-pop sm:p-8">{children}</div>
    </div>
  );
}
