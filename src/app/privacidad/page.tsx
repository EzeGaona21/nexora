import type { Metadata } from "next";

import { LEGAL_CONTACT, LegalPage, type LegalSection } from "@/components/landing/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda NEXORA, para qué los usa y cómo ejercer tus derechos.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Quién es responsable",
    body: (
      <p>
        NEXORA es un proyecto desarrollado por Ezequiel Gaona, en Argentina. Para cualquier consulta sobre
        tus datos podés escribir desde <a href={LEGAL_CONTACT}>el perfil de contacto</a>.
      </p>
    ),
  },
  {
    title: "Qué datos guardamos",
    body: (
      <ul>
        <li>
          <strong>De tu cuenta:</strong> nombre, correo electrónico y contraseña. La contraseña se guarda
          cifrada y nadie puede leerla.
        </li>
        <li>
          <strong>De tu comercio:</strong> lo que vos cargás: productos, ventas, gastos, proveedores,
          categorías y las personas de tu equipo.
        </li>
        <li>
          <strong>Técnicos:</strong> registros de acceso que generan los servidores, como fecha, dirección
          IP y navegador.
        </li>
      </ul>
    ),
  },
  {
    title: "Para qué los usamos",
    body: (
      <>
        <p>
          Para que el servicio funcione: mostrarte tus ventas, calcular ganancias, generar alertas,
          predicciones y reportes, y mantener tu cuenta segura.
        </p>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </>
    ),
  },
  {
    title: "Con quién se comparten",
    body: (
      <>
        <p>Solo con los proveedores que hacen funcionar NEXORA:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> base de datos y acceso a las cuentas.
          </li>
          <li>
            <strong>Vercel:</strong> alojamiento del sitio.
          </li>
          <li>
            <strong>Google (Gemini):</strong> cuando usás NEXORA AI, tu pregunta y los datos de tu comercio
            necesarios para responderla se envían a este servicio. Si no usás el asistente, no se envía
            nada.
          </li>
        </ul>
        <p>
          Estos proveedores pueden procesar la información en servidores fuera de Argentina. También
          podemos entregar datos si una autoridad competente lo exige por ley.
        </p>
      </>
    ),
  },
  {
    title: "Cookies",
    body: (
      <p>
        Usamos únicamente las cookies necesarias para mantener tu sesión iniciada. No usamos cookies de
        publicidad ni de seguimiento.
      </p>
    ),
  },
  {
    title: "Cómo los protegemos",
    body: (
      <p>
        Cada comercio trabaja en un espacio aislado: la base de datos impide que una cuenta lea
        información de otra. La conexión viaja cifrada y los permisos se validan en el servidor. Ningún
        sistema es infalible, pero trabajamos para reducir los riesgos.
      </p>
    ),
  },
  {
    title: "Cuánto tiempo los guardamos",
    body: (
      <p>
        Mientras tu cuenta esté activa. Si pedís la baja, eliminamos tu cuenta y los datos de tu comercio.
        Los registros técnicos se conservan por un tiempo limitado.
      </p>
    ),
  },
  {
    title: "Tus derechos",
    body: (
      <>
        <p>
          Según la Ley 25.326 de Protección de Datos Personales, podés pedir acceso a tus datos,
          corregirlos, actualizarlos o solicitar que se eliminen. Escribinos y te respondemos dentro de
          los plazos que fija la ley.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las
          denuncias y reclamos de quienes consideren afectados sus derechos en materia de datos
          personales.
        </p>
      </>
    ),
  },
  {
    title: "La cuenta de demostración",
    body: (
      <p>
        La demo muestra datos de un comercio ficticio. No ingreses información real ahí: es una cuenta
        compartida que cualquiera puede ver.
      </p>
    ),
  },
  {
    title: "Cambios en esta política",
    body: (
      <p>
        Si cambiamos algo importante, lo vamos a avisar en esta página y actualizar la fecha de arriba.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Tus datos son tuyos. Acá te contamos, sin vueltas, qué información guarda NEXORA, para qué la usa y qué podés hacer con ella."
      sections={SECTIONS}
    />
  );
}
