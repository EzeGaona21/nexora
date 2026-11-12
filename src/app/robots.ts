import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/supabase/env";

/** El sitio público se indexa; el sistema (con datos de cada comercio) no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard",
        "/ventas",
        "/productos",
        "/gastos",
        "/analytics",
        "/predicciones",
        "/alertas",
        "/asistente",
        "/reportes",
        "/equipo",
        "/configuracion",
        "/perfil",
        "/onboarding",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
