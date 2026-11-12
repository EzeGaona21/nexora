# Design system

**Dirección:** Dark Intelligent SaaS — Emerald Glass — Precision Analytics.
Referencias: Linear, Vercel, Stripe Dashboard, Raycast.

## Metodología (UI/UX Pro Max)

La skill UI/UX Pro Max no pudo instalarse en el entorno donde se construyó el proyecto (su instalador requiere npm y la red estaba bloqueada). Se aplicó su método de trabajo: definir el sistema a partir del tipo de producto y validar cada pantalla contra una lista de entrega. Para instalarla y usarla en tu máquina:

```bash
npm install -g uipro-cli
uipro init --ai claude
```

| Decisión | Elección para NEXORA | Motivo |
| --- | --- | --- |
| Tipo de producto | SaaS de gestión con analítica (B2B, uso diario) | Prioriza densidad legible y velocidad sobre impacto decorativo. |
| Estilo | Oscuro, plano, con vidrio solo en capas flotantes | El vidrio comunica elevación (nav, modales, tooltips, compositor del chat); en tarjetas restaría contraste. |
| Color | Un solo acento (esmeralda) + semánticos | El verde significa "marca / positivo"; rojo y ámbar quedan reservados para estado. |
| Tipografía | Geist Sans + Geist Mono para cifras | Cifras tabulares: las columnas de importes alinean. |
| Gráficos | Área para evolución, barras para comparar categorías, banda para incertidumbre | Una idea por gráfico; nunca tortas con muchas porciones. |
| Landing | Hero → características → cómo funciona → beneficios → precios → FAQ → CTA | Patrón de conversión con demo sin registro como CTA secundario. |

## Tokens (`src/app/globals.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#080B10` | Fondo |
| `surface` | `#111720` | Tarjetas, sidebar |
| `raised` | `#161D28` | Hover, elementos activos |
| `border` / `border-strong` | `#1E293B` / `#2B3A52` | Bordes |
| `fg` / `muted` / `subtle` | `#F8FAFC` / `#94A3B8` / `#64748B` | Texto |
| `brand` / `brand-bright` / `brand-deep` | `#10B981` / `#34D399` / `#064E3B` | Acento |
| `danger` / `warning` / `info` | `#F87171` / `#FBBF24` / `#60A5FA` | Estados |

Radio de tarjeta 14 px · escala de espaciado de Tailwind (múltiplos de 4 px) · contraste de texto principal 18:1 y secundario 7:1 sobre el fondo.

## Componentes

Primitivas en `src/components/ui/`: `Button`, `Input`, `Select`, `Field`, `Modal`, `Card`, `Badge`, `Skeleton`, `EmptyState`, `PageHeader`, `TableShell`, `Pagination`, `PeriodFilter`. Se construyen sobre Radix (accesibilidad) con el patrón de shadcn/ui (`cva` + `tailwind-merge`), sin copiar su tema por defecto.

### Referencias de 21st.dev

21st.dev no está disponible como conector en este entorno y el código de sus componentes requiere iniciar sesión, por lo que no se copiaron archivos. Se tomaron como referencia de patrón y se implementaron con los tokens de NEXORA:

| Referencia | Dónde se aplica | Adaptación |
| --- | --- | --- |
| Spotlight Card | `SpotlightCard` (KPIs, características) | Halo esmeralda al 11 %, elevación de 2 px, sin sombra. |
| Animated AI Chat | `components/ai/assistant-view.tsx` | Compositor de vidrio que crece con el texto, sugerencias, indicador de "consultando datos", sin paleta de comandos. |
| Stats | `KpiCard`, resumen de reportes | Cifra tabular grande, variación con color semántico y texto de período. |
| Limelight Nav | Sidebar y pestañas | Indicador activo compartido con `layoutId`. |

Para sumar un componente de 21st.dev más adelante: `npx shadcn@latest add "<URL del componente>"` y reemplazar sus colores por los tokens de esta tabla.

## Movimiento (`src/lib/motion.ts`)

- Librería: **Motion for React** (`motion/react`).
- Duraciones: 150 ms (hover, salida), 280 ms (entrada), 450 ms (aparición en scroll). Curva `[0.22, 1, 0.36, 1]`.
- Solo se animan `transform` y `opacity`.
- Variants reutilizables: `fadeUp`, `fadeIn`, `stagger`, `scaleIn`, `overlay`, `slideInLeft`, `listItem`.
- Primitivas: `Reveal`, `Stagger`, `AnimatedNumber` (`useMotionValue` + `useTransform`), `SpotlightCard` (`useMotionTemplate`), `GrowBar`.
- `AnimatePresence` en modales, drawer mobile, listas con altas y bajas, mensajes del chat y errores de formulario.
- `<MotionConfig reducedMotion="user">` en el layout raíz respeta `prefers-reduced-motion`; el skeleton también se detiene.

## Checklist de entrega por pantalla

- [ ] Sin emojis como iconos: todos los iconos son de Lucide, mismo grosor.
- [ ] Todo elemento clicable tiene `cursor-pointer`, hover visible y foco visible.
- [ ] Objetivos táctiles de 36 px o más; formularios usables con una mano en 375 px.
- [ ] Sin scroll horizontal de página en 375, 768, 1024 y 1440 px (las tablas scrollean dentro de su tarjeta).
- [ ] Estados vacío, cargando (skeleton) y error presentes.
- [ ] Cifras con fuente tabular y formato es-AR.
- [ ] Texto secundario con contraste de 4,5:1 o más.
- [ ] Animaciones de 150 a 450 ms y desactivadas con "reducir movimiento".
- [ ] Etiquetas en todos los campos; errores asociados con `aria-describedby`.
