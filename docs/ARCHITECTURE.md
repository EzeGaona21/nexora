# Arquitectura

## Visión general

```
Navegador ── Server Components / Server Actions / Route Handlers (Next.js 16)
                     │  cookies de sesión (@supabase/ssr)
                     ▼
              Supabase Auth ── PostgreSQL con Row Level Security
                     ▲
   API de IA ◄── servidor (tool use: el modelo pide funciones, el servidor consulta)
```

- **Lectura:** Server Components llaman a `getSessionContext()` (sesión + comercio + rol, cacheado por request) y consultan Supabase con la sesión del usuario. RLS filtra cada consulta.
- **Escritura:** Server Actions (`src/actions/*`) validan con Zod, verifican rol y llaman a funciones SQL atómicas o a tablas con políticas de escritura.
- **Descargas:** Route Handlers (`src/app/api/*`) generan CSV y PDF en el servidor.
- **Lógica pura:** predicción, alertas, KPIs, períodos, desgloses y exportaciones viven en `src/lib/*` sin dependencias de framework y con tests (`node --test`).

## Estructura de carpetas

```
src/
  app/
    (auth)/            login, registro, recuperar, actualizar-clave
    (app)/             área autenticada: dashboard, ventas, productos, gastos,
                       asistente, analytics, predicciones, alertas, reportes,
                       equipo, configuracion, perfil
    api/               reportes/[tipo] (CSV/PDF), ventas/[id]/comprobante (PDF)
    auth/confirm/      verificación de enlaces de email
    onboarding/        alta del comercio
    precios/           planes
  actions/             server actions por dominio
  components/          ui/ (primitivas), motion/, charts/, layout/ y vistas por módulo
  lib/
    ai/                proveedor configurable, herramientas de lectura, prompt
    alerts/            reglas del centro de alertas
    analytics/         KPIs y desgloses
    auth/              contexto de sesión
    data/              lecturas compartidas (RPC)
    forecast/          modelos estadísticos
    reports/           datasets, CSV y PDF
    supabase/          clientes de servidor y navegador
    validations/       esquemas Zod
  proxy.ts             protección de rutas y refresco de sesión (Next 16)
supabase/migrations/   esquema, RLS, funciones, seed y módulo de IA/equipo
scripts/seed-demo.mjs  crea la demo
tests/                 tests de lógica crítica
```

## Modelo de datos

| Tabla | Rol |
| --- | --- |
| `organizations` | Comercio (tenant): plan, bandera de demo, contador de comprobantes. |
| `memberships` | Usuario ↔ comercio con rol `admin` / `employee` / `demo`. |
| `profiles` | Nombre visible del usuario. |
| `invitations` | Invitaciones pendientes por email. |
| `categories`, `suppliers`, `products` | Catálogo. Los productos se archivan, no se borran. |
| `sales`, `sale_items` | Ventas con precio y costo congelados al momento de vender. |
| `stock_movements` | Libro mayor: `products.stock` siempre es la suma de sus movimientos. |
| `expenses` | Gastos. |
| `ai_conversations`, `ai_messages`, `ai_usage` | Historial privado por usuario y cupo de IA por período. |

Todas las filas de negocio llevan `org_id`. Las relaciones internas usan claves compuestas `(org_id, id)`.

## Decisiones

1. **La base es la última línea de defensa.** La app valida, pero el aislamiento y la consistencia del stock están garantizados por RLS, funciones `SECURITY DEFINER` con verificación de rol e índices únicos.
2. **Idempotencia de ventas.** El formulario genera un UUID por intento; reenviarlo devuelve la venta original. Un doble clic o un reintento de red nunca descuenta stock dos veces.
3. **Fechas de negocio en Argentina.** Los días se agrupan con `America/Argentina/Buenos_Aires` en SQL y se manejan como strings `YYYY-MM-DD` en TypeScript.
4. **Predicción honesta.** El modelo se elige según la historia disponible y su error se mide con backtest; con menos de 14 días no se predice.
5. **IA con herramientas, no con SQL.** El modelo solo puede invocar funciones de lectura parametrizadas. El comercio sale de la sesión; un mensaje malicioso no puede cambiar de tenant ni escribir.
6. **Un comercio activo por cuenta.** `getSessionContext` usa la primera membresía. El selector multi-comercio queda fuera del MVP.
7. **Sin SDK de IA ni de PDF pesado.** `fetch` directo al proveedor y `pdf-lib` con fuentes estándar: menos dependencias y builds más chicos.

## Riesgos técnicos conocidos

| Riesgo | Mitigación |
| --- | --- |
| Costo de IA por abuso de la demo | Cupo diario compartido en la base (`ai_limit`), respuestas acotadas en tokens y pasos. |
| Datos de demo que envejecen | El seed es relativo a hoy e idempotente; volver a correrlo los actualiza. |
| Consultas analíticas con mucho historial | Índices por `(org_id, created_at)`, períodos acotados a 366 días, agregación en SQL. |
| Cambios de API entre versiones mayores (Next, Zod, Recharts) | Versiones fijadas por rango mayor en `package.json`; correr `npm run typecheck` y `npm run build` tras actualizar. |
