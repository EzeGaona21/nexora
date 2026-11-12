import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/supabase/env";

/** Páginas públicas que queremos que los buscadores indexen. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/precios", priority: 0.8 },
    { path: "/registro", priority: 0.6 },
    { path: "/login", priority: 0.4 },
    { path: "/terminos", priority: 0.2 },
    { path: "/privacidad", priority: 0.2 },
  ];
  return pages.map((p) => ({
    url: `${siteUrl}${p.path}`,
    changeFrequency: "monthly",
    priority: p.priority,
  }));
}
