import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authCookieOptions, isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/env";

/** Rutas que exigen sesión. Todo lo demás es público. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/productos",
  "/ventas",
  "/gastos",
  "/predicciones",
  "/alertas",
  "/analytics",
  "/asistente",
  "/reportes",
  "/configuracion",
  "/perfil",
  "/equipo",
  "/api/reportes",
  "/api/ventas",
  "/onboarding",
  "/actualizar-clave",
];

const AUTH_PAGES = ["/login", "/registro", "/recuperar"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Next.js 16: este archivo reemplaza a middleware.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = matches(pathname, PROTECTED_PREFIXES);

  if (!isSupabaseConfigured) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?error=config";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // No ejecutar código entre la creación del cliente y getUser():
  // esta llamada valida el token contra Supabase y lo refresca si venció.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    // Conserva las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && isProtected) {
    return redirectTo("/login", `?next=${encodeURIComponent(pathname)}`);
  }
  if (user && matches(pathname, AUTH_PAGES)) {
    return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
