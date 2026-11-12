import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_CONTACT, LegalPage, type LegalSection } from "@/components/landing/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de NEXORA.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Qué es NEXORA",
    body: (
      <p>
        NEXORA es una herramienta en línea para registrar ventas, stock y gastos de un comercio, y para
        analizar esa información. Al crear una cuenta o usar el sitio aceptás estos términos.
      </p>
    ),
  },
  {
    title: "Tu cuenta",
    body: (
      <ul>
        <li>Tenés que ser mayor de 18 años y dar datos verdaderos.</li>
        <li>Sos responsable de cuidar tu contraseña y de lo que se haga desde tu cuenta.</li>
        <li>Si sumás personas a tu equipo, sos responsable de los permisos que les das.</li>
      </ul>
    ),
  },
  {
    title: "Uso permitido",
    body: (
      <>
        <p>Podés usar NEXORA para gestionar tu comercio. No está permitido:</p>
        <ul>
          <li>Intentar acceder a datos de otros comercios o vulnerar la seguridad del servicio.</li>
          <li>Usarlo para actividades ilegales o cargar contenido que infrinja derechos de terceros.</li>
          <li>Copiar, revender o redistribuir el servicio sin autorización.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Tus datos",
    body: (
      <p>
        La información que cargás es tuya. Nos autorizás a procesarla solo para prestarte el servicio,
        como explica la <Link href="/privacidad">Política de privacidad</Link>. Podés exportarla en
        reportes y pedir que se elimine cuando quieras.
      </p>
    ),
  },
  {
    title: "Predicciones, alertas y asistente",
    body: (
      <>
        <p>
          Las predicciones, las alertas y las respuestas de NEXORA AI son estimaciones basadas en los
          datos que cargaste. Pueden tener errores y no reemplazan el consejo de un contador ni de otro
          profesional. Las decisiones sobre tu negocio son tuyas.
        </p>
        <p>
          Los comprobantes que genera NEXORA son internos: <strong>no son facturas</strong> ni tienen
          validez fiscal.
        </p>
      </>
    ),
  },
  {
    title: "Planes y precios",
    body: (
      <p>
        El plan gratuito no tiene costo. Los planes pagos, cuando estén disponibles, se informarán con su
        precio en pesos argentinos antes de contratarlos, y vas a poder darlos de baja cuando quieras.
      </p>
    ),
  },
  {
    title: "Disponibilidad",
    body: (
      <p>
        Trabajamos para que NEXORA funcione siempre, pero puede haber interrupciones por mantenimiento o
        por fallas de los proveedores. El servicio se ofrece tal como está, sin garantía de
        funcionamiento ininterrumpido.
      </p>
    ),
  },
  {
    title: "Responsabilidad",
    body: (
      <p>
        En la medida que la ley lo permita, NEXORA no responde por pérdidas de ganancias o daños
        indirectos derivados del uso del servicio. Nada de lo que dice acá limita los derechos que te da
        la Ley 24.240 de Defensa del Consumidor.
      </p>
    ),
  },
  {
    title: "Propiedad intelectual",
    body: (
      <p>
        El nombre NEXORA, el diseño y el código del sitio pertenecen a su autor, Ezequiel Gaona. Todos
        los derechos reservados.
      </p>
    ),
  },
  {
    title: "Baja de la cuenta",
    body: (
      <p>
        Podés dejar de usar NEXORA en cualquier momento y pedir que eliminemos tu cuenta y los datos de
        tu comercio. Podemos suspender una cuenta que incumpla estos términos.
      </p>
    ),
  },
  {
    title: "Cambios y ley aplicable",
    body: (
      <p>
        Podemos actualizar estos términos; si el cambio es importante lo avisaremos en esta página. Se
        rigen por las leyes de la República Argentina. Por consultas, escribí desde{" "}
        <a href={LEGAL_CONTACT}>el perfil de contacto</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Las reglas para usar NEXORA, escritas para que se entiendan."
      sections={SECTIONS}
    />
  );
}
