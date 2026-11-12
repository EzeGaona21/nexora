import { NavProgress } from "@/components/layout/nav-progress";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { MotionProvider } from "@/components/motion/primitives";
import { siteUrl } from "@/lib/supabase/env";

import "./globals.css";

// Display condensada para titulares (Anton, licencia OFL, auto-alojada).
const display = localFont({
  src: "./fonts/anton-latin-400-normal.woff2",
  variable: "--font-anton",
  weight: "400",
  display: "swap",
});

// Fuentes auto-alojadas (paquete geist): el build no depende de Google Fonts.
// Exponen las variables --font-geist-sans y --font-geist-mono.

export const metadata: Metadata = {
  authors: [{ name: "Ezequiel Gaona", url: "https://github.com/EzeGaona21" }],
  creator: "Ezequiel Gaona",
  verification: { google: "M30ifBEnTQ_t7UlSJS-WwuWbpQq31j4ECxsaeVi4t5E" },
  metadataBase: new URL(siteUrl),
  title: {
    default: "NEXORA — Gestión y predicción de ventas para comercios",
    template: "%s · NEXORA",
  },
  description:
    "Ventas, stock y gastos en un solo lugar, con análisis y predicciones para decidir mejor. Hecho para comercios de Argentina.",
  keywords: [
    "sistema de ventas",
    "control de stock",
    "gestión para comercios",
    "software para almacenes",
    "software para kioscos",
    "predicción de ventas",
    "punto de venta Argentina",
  ],
  openGraph: {
    siteName: "NEXORA",
    title: "NEXORA — Gestión y predicción de ventas para comercios",
    description:
      "Ventas, stock y gastos en un solo lugar, con análisis y predicciones para decidir mejor.",
    locale: "es_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080B10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <MotionProvider>
          <NavProgress />
          {children}
        </MotionProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111720",
              border: "1px solid #1E293B",
              color: "#F8FAFC",
            },
          }}
        />
      </body>
    </html>
  );
}
