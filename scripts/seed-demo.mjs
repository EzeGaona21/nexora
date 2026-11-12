#!/usr/bin/env node
/**
 * Crea (o regenera) el comercio de demostración de NEXORA.
 *
 *   npm run seed:demo
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * DEMO_USER_EMAIL y DEMO_USER_PASSWORD. Usa la clave secreta, así que corre
 * SOLO en tu máquina o en un entorno de servidor: nunca en el navegador.
 *
 * Es idempotente: se puede ejecutar todas las veces que haga falta. Los datos
 * se calculan con hashes determinísticos relativos a la fecha de hoy, por eso
 * conviene volver a correrlo cada tanto para que la demo no quede "vieja".
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_USER_EMAIL;
const password = process.env.DEMO_USER_PASSWORD;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: secret,
  DEMO_USER_EMAIL: email,
  DEMO_USER_PASSWORD: password,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length > 0) {
  console.error(`Faltan variables en .env.local: ${missing.join(", ")}`);
  process.exit(1);
}
if (password.length < 12) {
  console.error("DEMO_USER_PASSWORD debe tener al menos 12 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

function fail(step, error) {
  console.error(`✗ ${step}: ${error.message ?? error}`);
  process.exit(1);
}

async function findUserByEmail(target) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail("Buscar usuario de demo", error);
    const match = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

// 1 · Usuario de demostración (rol de solo lectura)
// La base bloquea cualquier cambio de clave o email de la cuenta de demo
// (migración 0006). Si ya existe y la clave de .env.local sigue funcionando,
// se conserva; si no, se elimina y se crea de nuevo.
async function createDemoUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Visitante" },
  });
  if (error) fail("Crear usuario de demo", error);
  return data.user;
}

let user = await findUserByEmail(email);
if (user) {
  const probe = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginError } = await probe.auth.signInWithPassword({ email, password });
  if (loginError) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) fail("Reemplazar usuario de demo", error);
    user = await createDemoUser();
    console.log(`• Usuario de demo recreado con la clave actual: ${email}`);
  } else {
    console.log(`• Usuario de demo existente: ${email}`);
  }
} else {
  user = await createDemoUser();
  console.log(`• Usuario de demo creado: ${email}`);
}

// 2 · Comercio ficticio
let { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("id, name")
  .eq("is_demo", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
if (orgError) fail("Buscar comercio de demo", orgError);
if (!org) {
  const created = await supabase
    .from("organizations")
    .insert({ name: "Almacén Don Julio", business_type: "almacen", is_demo: true, plan: "pro" })
    .select("id, name")
    .single();
  if (created.error) fail("Crear comercio de demo", created.error);
  org = created.data;
  console.log(`• Comercio de demo creado: ${org.name}`);
} else {
  console.log(`• Comercio de demo existente: ${org.name}`);
}

// 3 · Membresía con rol "demo" (solo lectura por RLS)
const { error: memberError } = await supabase
  .from("memberships")
  .upsert({ org_id: org.id, user_id: user.id, role: "demo" }, { onConflict: "org_id,user_id" });
if (memberError) fail("Asignar membresía de demo", memberError);

// 4 · Datos: 180 días de ventas, stock y gastos coherentes entre sí
console.log("• Generando 180 días de operación (puede tardar unos segundos)…");
const { error: seedError } = await supabase.rpc("seed_demo_data", { p_org: org.id, p_days: 180 });
if (seedError) fail("Generar datos de demo", seedError);

const [{ count: sales }, { count: products }, { count: expenses }] = await Promise.all([
  supabase.from("sales").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  supabase.from("products").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  supabase.from("expenses").select("id", { count: "exact", head: true }).eq("org_id", org.id),
]);
console.log(`✓ Demo lista: ${products} productos, ${sales} ventas y ${expenses} gastos.`);
console.log('  Probala con el botón "Explorar demo" de la página de inicio.');
