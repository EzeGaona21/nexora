# Registro de avance

Última actualización: 11/11/2026.

## Implementado

| Etapa | Estado | Notas |
| --- | --- | --- |
| 1 · Arquitectura y base de datos | Hecho | Migraciones 0001–0005. |
| 2 · Sistema visual y layout | Hecho | Tokens, primitivas, sidebar, shell mobile, skeletons. |
| 3 · Autenticación y multi-tenancy | Hecho | Registro, login, recuperación, onboarding, RLS, roles, protección de rutas. |
| 4 · Productos, ventas y gastos | Hecho | Incluye comprobante en PDF. |
| 5 · Dashboard y analytics | Hecho | Dashboard + página de Analytics con período. |
| 6 · NEXORA AI | Hecho | Requiere `AI_API_KEY` y `AI_MODEL` para responder. |
| 7 · Predicciones y alertas | Hecho | |
| 8 · Reportes y exportación | Hecho | 5 reportes, CSV y PDF. |
| 9 · Demo, testing y deployment | Parcial | Seed y tests listos; falta crear el usuario de demo y desplegar. |
| Extra · Equipo, configuración y perfil | Hecho | Invitaciones por email sin envío de correo (ver pendientes). |

## Verificado

- **Base de datos (contra el proyecto real de Supabase `nexora`, región sa-east-1):** las 5 migraciones aplican sin errores. Prueba con dos usuarios y dos comercios: un comercio no ve productos, ventas, equipo ni analítica del otro; no puede venderle ni cancelarle ventas ni consumir su cupo de IA; reenviar la misma venta devuelve la original y descuenta stock una sola vez; no se puede vender más que el stock; cancelar dos veces falla sin tocar stock; un empleado no puede cancelar ventas ni quitar al administrador; el rol anónimo no lee nada; el plan Inicial no admite invitaciones.
- **Datos de demo:** 34 productos, 5.038 ventas, 11.552 ítems y 56 gastos generados; cero ventas inconsistentes y cero diferencias entre stock y libro mayor.
- **Linter de seguridad de Supabase:** sin tablas sin RLS; solo las advertencias esperadas por funciones `SECURITY DEFINER` expuestas a propósito.
- **Tests:** 46 de 46 en verde (predicción, alertas, KPIs, períodos, CSV, PDF, desgloses).
- **PDF:** reporte y comprobante generados y revisados visualmente.
- **Ciclo de IA:** probado contra un servidor simulado para los dos proveedores (pedido de herramienta → ejecución → respuesta final).

## Verificado después de instalar dependencias

- `npm install`, `npm run typecheck` (sin errores) y `npm run build` (25 rutas) con Next 16.4.6, React 19.3, Tailwind 4.3, Zod 4.6, Recharts 3.10 y Motion 12.43.
- Las fuentes pasaron de `next/font/google` al paquete `geist` (auto-alojadas): el build ya no necesita acceso a Google Fonts.
- Páginas públicas (inicio, precios, login, registro) revisadas en 1440 px y 375 px: sin desborde horizontal ni errores de consola. Se agregó el favicon.
- Las rutas privadas y las descargas redirigen a `/login` sin sesión.

- **Circuito de escritura con una cuenta real:** alta de comercio, producto, venta con descuento (sin duplicar ante doble clic), cancelación con devolución de stock, gasto y bloqueo de invitaciones en el plan Inicial.
- **NEXORA AI con un proveedor real** (Google Gemini, plan gratuito, modelo `gemini-flash-lite-latest`): tres consultas respondidas con cifras que coinciden con el dashboard. Los modelos Flash completos no respondieron a tiempo en el plan gratuito.

- **Auditoría de seguridad (migración 0006):** 16 intentos de ataque probados contra la base real y todos bloqueados (sumar miembros a la fuerza, mover filas a otro comercio, subirse de plan, vaciar tablas, cambiar la clave o el nombre de la cuenta de demo, crear comercios con la demo, escribir con la demo). `npm audit` sin vulnerabilidades. Cabeceras de seguridad verificadas en el build de producción sin errores de consola.

## No verificado

- **Pantallas con sesión** (dashboard, ventas, productos, gastos, NEXORA AI, analytics, predicciones, alertas, reportes, equipo, configuración, perfil): compilan, pero no se vieron en un navegador porque el entorno de construcción no tiene salida de red hacia `*.supabase.co`.
- **Flujo de emails de Supabase** (confirmación y recuperación).

## Pendiente

1. Revisar cada pantalla con sesión en 375 px y 1440 px y corregir los defectos visuales que aparezcan.
2. Completar `.env.local` (clave secreta, clave de demo, clave de IA) y correr `npm run seed:demo`.
3. Deploy en Vercel y configuración de URLs en Supabase Auth.
4. Restringir por plan las funciones que la página de precios marca como pagas (predicciones, alertas completas, reportes). Hoy solo se aplican los límites de productos, usuarios y consultas de IA.
5. Envío de email al invitar a alguien al equipo (hoy la invitación se activa cuando esa persona se registra con ese email).
6. Selector de comercio para cuentas con más de una membresía.
7. Cobros y suscripciones (deliberadamente fuera del MVP).
8. Respuestas de IA en streaming.
9. Instalar la skill UI/UX Pro Max y revisar el diseño con su checklist; evaluar componentes concretos de 21st.dev con sesión iniciada.

## Archivos agregados en la última fase

```
supabase/migrations/0005_ai_team_analytics.sql
scripts/seed-demo.mjs
src/lib/period.ts
src/lib/analytics/breakdowns.ts
src/lib/data/analytics.ts
src/lib/ai/{provider,tools,prompt}.ts
src/lib/reports/{types,cells,csv,pdf,build}.ts
src/actions/{ai,settings,team}.ts
src/app/(app)/{analytics,asistente,reportes,equipo,configuracion,perfil}/page.tsx
src/app/api/reportes/[tipo]/route.ts
src/app/api/ventas/[id]/comprobante/route.ts
src/components/ai/assistant-view.tsx
src/components/charts/analytics-charts.tsx
src/components/reports/report-tabs.tsx
src/components/settings/settings-forms.tsx
src/components/team/team-view.tsx
src/components/ui/period-filter.tsx
tests/{reports-period,pdf}.test.ts
README.md, docs/*
```
