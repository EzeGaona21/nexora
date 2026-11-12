# NEXORA

Plataforma de gestión, análisis y predicción de ventas para pequeños y medianos comercios de Argentina. Ventas, stock y gastos en un solo lugar; dashboard ejecutivo, predicciones estadísticas, alertas por reglas y un asistente de IA que responde consultando los datos reales del comercio.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 4 · Motion · Recharts · Zod · React Hook Form · Supabase (PostgreSQL + Auth + RLS) · pdf-lib · Geist (auto-alojada) · Vercel.
- **Idioma y moneda:** español rioplatense, pesos argentinos (ARS), huso horario de Buenos Aires.
- **Estado del proyecto:** ver [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Módulos

| Módulo | Ruta | Qué hace |
| --- | --- | --- |
| Dashboard | `/dashboard` | Facturación del día y del mes, ganancia, ticket, margen, comparación con el período anterior, top de productos, alertas de stock y actividad reciente. |
| Ventas | `/ventas` | Punto de venta con varios productos, descuento y medio de pago. Descuento de stock atómico e idempotente, cancelación con devolución de stock y comprobante interno en PDF. |
| Productos | `/productos` | ABM con SKU, código de barras, categoría, proveedor, costos, margen, stock mínimo, imagen, filtros, búsqueda y paginación. |
| Gastos | `/gastos` | Registro por categoría y resultado neto estimado del mes. |
| NEXORA AI | `/asistente` | Chat con historial. El modelo solo puede leer datos mediante funciones del backend; nunca escribe SQL ni modifica nada. |
| Analytics | `/analytics` | Facturación y ganancia por día, por día de semana, por hora, por categoría, por medio de pago y clasificación ABC. |
| Predicciones | `/predicciones` | Estimación a 7, 14 y 30 días (media móvil, tendencia + estacionalidad o Holt-Winters según la historia), con backtest y banda de incertidumbre. |
| Alertas | `/alertas` | Stock crítico, reposición, productos sin movimiento, caída de ventas, gastos elevados y margen reducido. Cada alerta muestra su regla. |
| Reportes | `/reportes` | Ventas, rentabilidad, gastos, inventario y rendimiento de productos, por período, exportables a CSV y PDF. |
| Equipo | `/equipo` | Invitaciones por email, roles (administrador / empleado) y cupo de usuarios según el plan. |
| Configuración y perfil | `/configuracion`, `/perfil` | Datos del comercio, plan y uso, datos personales y cambio de contraseña. |
| Sitio público | `/`, `/precios` | Landing, planes y "Explorar demo". |

## Puesta en marcha local

Requisitos: Node.js 22.18 o superior y un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run dev                  # http://localhost:3000
```

### 1. Base de datos

Aplicá las migraciones de `supabase/migrations/` en orden (`0001` a `0006`). Dos formas:

- **Supabase CLI:** `npx supabase link --project-ref <ref>` y luego `npx supabase db push`.
- **SQL Editor:** pegá y ejecutá cada archivo en orden.

| Migración | Contenido |
| --- | --- |
| `0001_schema.sql` | Tablas multi-tenant, claves foráneas compuestas `(org_id, id)`, libro mayor de stock. |
| `0002_rls.sql` | Row Level Security en todas las tablas y permisos por rol. |
| `0003_functions.sql` | `create_sale` / `cancel_sale` atómicas e idempotentes y consultas analíticas. |
| `0004_demo_seed.sql` | Generador determinístico de datos de demostración. |
| `0005_ai_team_analytics.sql` | Conversaciones y cupo de IA, invitaciones de equipo, analítica por período. |
| `0006_hardening.sql` | Endurecimiento: permisos por columna, membresías sin altas directas, protección de la cuenta de demo. |

### 2. Autenticación

En Supabase → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (o tu dominio).
- **Redirect URLs:** `http://localhost:3000/auth/confirm` y la equivalente de producción.

Para que la confirmación de email y la recuperación de contraseña usen el flujo del servidor, en Authentication → Email Templates apuntá los enlaces a
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (confirmación) y
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/actualizar-clave` (recuperación).

### 3. Demo pública

```bash
npm run seed:demo
```

Crea el usuario de demostración (rol de solo lectura), el comercio ficticio "Almacén Don Julio" y 180 días de ventas, stock y gastos coherentes entre sí. Necesita `SUPABASE_SECRET_KEY`, `DEMO_USER_EMAIL` y `DEMO_USER_PASSWORD` en `.env.local`. Es idempotente; conviene repetirlo cada tanto para que las fechas sigan siendo recientes.

Los datos no usan `random()`: cada valor sale de un hash de (fecha, venta, ítem), así que recargar la página muestra siempre lo mismo.

### 4. NEXORA AI

Definí en el servidor:

```
AI_PROVIDER=anthropic        # o "openai" para cualquier API compatible con Chat Completions
AI_API_KEY=...
AI_MODEL=...                 # identificador del modelo de tu proveedor
```

Sin estas variables el asistente muestra que no está conectado; **nunca simula respuestas**. El modelo recibe ocho herramientas de solo lectura (`src/lib/ai/tools.ts`) que se ejecutan con la sesión del usuario, por lo que Row Level Security aplica igual que en el resto de la app. El cupo de consultas por plan se descuenta de forma atómica en la base (`ai_consume`).

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `npm start` | Build y servidor de producción. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Tests de la lógica crítica (predicción, alertas, KPIs, períodos, CSV, PDF, desgloses). |
| `npm run seed:demo` | Genera o regenera la demo. |

## Deploy en Vercel

1. Subí el repositorio a GitHub e importalo en Vercel (framework: Next.js, sin configuración extra).
2. Cargá las variables de `.env.example` **excepto** `SUPABASE_SECRET_KEY` (solo la usa el seed, desde tu máquina).
3. Definí `NEXT_PUBLIC_SITE_URL` con el dominio final y agregalo en Supabase → URL Configuration.

## Seguridad

**Aislamiento entre comercios**
- Todas las tablas tienen Row Level Security. El comercio activo se resuelve en el servidor a partir de la membresía, nunca de un parámetro del cliente.
- Las claves foráneas compuestas impiden referenciar filas de otro comercio aunque se conozca su UUID.
- Cada tabla solo permite editar columnas concretas: nadie puede mover una fila a otro comercio, cambiarse de plan ni reescribir autores o fechas.
- Las membresías no admiten altas directas: solo se crean al fundar un comercio o al aceptar una invitación con email confirmado.

**Operaciones**
- `create_sale` bloquea comercio y productos, toma precio y costo de la base y usa una clave de idempotencia; un índice único garantiza que una venta mueva el stock de un producto una sola vez. Ventas, ítems y movimientos no admiten escritura directa.
- Roles `admin`, `employee` y `demo` (solo lectura). Un comercio no puede quedarse sin administrador.

**Cuenta de demostración**
- Es compartida, así que la base bloquea cualquier cambio de clave, email o nombre, y no puede crear comercios. Su cupo de IA es diario y acotado.

**Navegador**
- Cookies de sesión `httpOnly`, `SameSite=Lax` y `Secure` en producción: ningún script puede leer los tokens.
- Cabeceras: Content-Security-Policy (sin orígenes externos de scripts, formularios ni conexiones), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` y `Permissions-Policy`.
- No hay HTML sin escapar: las respuestas de la IA se renderizan como texto.

**Servidor**
- Solo las variables `NEXT_PUBLIC_*` llegan al navegador. La clave de IA y la clave secreta de Supabase se usan únicamente en el servidor.
- Validación con Zod en cliente y servidor; redirecciones solo a rutas internas; los CSV neutralizan celdas que empiezan con `= + - @`.
- El asistente de IA solo puede invocar funciones de lectura con la sesión del usuario: un mensaje malicioso no puede cambiar de comercio ni modificar datos.

**Configuración recomendada en Supabase (manual)**
- Authentication → Sign In / Providers → Email: longitud mínima de contraseña 8 y requisito de letras y números, para que coincida con la validación de la app.
- Authentication → Attack Protection: activar la protección contra contraseñas filtradas y el CAPTCHA en registro e inicio de sesión.
- Authentication → Rate Limits: revisar los topes de registros e inicios de sesión por hora.

**Riesgos conocidos**
- La política de contenido permite scripts en línea (`'unsafe-inline'`), necesarios para el arranque de Next.js sin nonce.
- No hay limitación de intentos propia en el inicio de sesión: depende de los límites de Supabase Auth.
- Las funciones `SECURITY DEFINER` expuestas (`create_sale`, `cancel_sale`, `invite_member`, etc.) son intencionales: cada una valida identidad y rol antes de operar. El linter de Supabase las marca como advertencia.

## Planes

`src/lib/plans.ts` define Inicial, Profesional y Negocio con sus límites (productos, usuarios, consultas de IA). Los límites de productos se validan en las server actions; los de usuarios e IA, además, dentro de la base. **No hay cobros implementados:** el plan se cambia a mano (`update organizations set plan = 'pro'`) hasta integrar un proveedor de pagos.

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura, modelo de datos y decisiones.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — dirección visual, tokens, movimiento y checklist de entrega.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — qué está implementado, qué se verificó y qué falta.

## Autor

Diseñado y desarrollado por **Ezequiel Gaona** · [github.com/EzeGaona21](https://github.com/EzeGaona21)

Demo en vivo: https://nexora-app-ai.vercel.app
