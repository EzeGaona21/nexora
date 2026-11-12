const RUBROS = [
  "Almacenes",
  "Ferreterías",
  "Tiendas de ropa",
  "Kioscos",
  "Farmacias",
  "Venta por WhatsApp",
  "Emprendimientos",
  "Comercios de barrio",
];

/** Franja a sangre con los rubros: cinta continua, se detiene con "reducir movimiento". */
export function RubrosMarquee() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {RUBROS.map((r) => (
        <li key={r} className="flex items-center whitespace-nowrap">
          <span className="px-5 sm:px-8">{r}</span>
          <span aria-hidden className="size-2.5 bg-black sm:size-3.5" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Rubros para los que sirve NEXORA" className="overflow-hidden bg-brand py-3 text-black sm:py-4">
      <div className="display marquee flex w-max text-3xl sm:text-5xl">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
