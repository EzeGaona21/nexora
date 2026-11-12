import { z } from "zod";

import { PAYMENT_METHOD_VALUES } from "@/lib/format";

/**
 * Esquemas compartidos: el formulario valida con ellos en el navegador y la
 * server action vuelve a validar en el servidor (nunca se confía en el cliente).
 * Sin transformaciones ni defaults para que el tipo de entrada y el de salida
 * coincidan con React Hook Form.
 */

const money = z
  .number({ error: "Ingresá un importe válido" })
  .min(0, "No puede ser negativo")
  .max(999_999_999, "Importe demasiado alto");

const integer = z
  .number({ error: "Ingresá un número válido" })
  .int("Debe ser un número entero")
  .min(0, "No puede ser negativo")
  .max(1_000_000, "Valor demasiado alto");

// ── Auth ──
export const loginSchema = z.object({
  email: z.email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
  businessName: z.string().trim().min(2, "Ingresá el nombre del comercio").max(80),
  email: z.email("Ingresá un email válido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres")
    .regex(/[a-zA-Z]/, "Incluí al menos una letra")
    .regex(/[0-9]/, "Incluí al menos un número"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const recoverSchema = z.object({ email: z.email("Ingresá un email válido") });
export type RecoverInput = z.infer<typeof recoverSchema>;

export const newPasswordSchema = z
  .object({
    password: registerSchema.shape.password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Ingresá el nombre del comercio").max(80),
  businessType: z.string().min(1, "Elegí un rubro").max(40),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Productos ──
export const productSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre").max(120),
  sku: z.string().trim().min(1, "Ingresá el SKU").max(40),
  barcode: z.string().trim().max(40),
  category: z.string().trim().max(60),
  supplier: z.string().trim().max(80),
  costPrice: money,
  salePrice: money,
  stock: integer,
  minStock: integer,
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Debe ser una URL https://"),
});
export type ProductInput = z.infer<typeof productSchema>;

// ── Ventas ──
export const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(100_000),
      }),
    )
    .min(1, "Agregá al menos un producto")
    .max(200),
  discount: money,
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES, { error: "Elegí un método de pago" }),
  customerName: z.string().trim().max(80),
  idempotencyKey: z.uuid(),
});
export type SaleInput = z.infer<typeof saleSchema>;

// ── Gastos ──
export const expenseSchema = z.object({
  category: z.string().trim().min(1, "Elegí una categoría").max(60),
  description: z.string().trim().min(1, "Ingresá una descripción").max(200),
  amount: z
    .number({ error: "Ingresá un importe válido" })
    .positive("Debe ser mayor a cero")
    .max(999_999_999, "Importe demasiado alto"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES, { error: "Elegí un método de pago" }),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// ── NEXORA AI ──
export const aiMessageSchema = z.object({
  conversationId: z.uuid().nullable(),
  message: z.string().trim().min(1, "Escribí una consulta").max(2000, "La consulta es demasiado larga"),
  /** Solo se usa en la demo (sin historial guardado): turnos previos de esta sesión. */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(6000) }))
    .max(20),
});
export type AiMessageInput = z.infer<typeof aiMessageSchema>;

// ── Configuración, perfil y equipo ──
export const orgSettingsSchema = onboardingSchema;
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Ingresá tu contraseña actual"),
    password: registerSchema.shape.password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const inviteSchema = z.object({
  email: z.email("Ingresá un email válido").max(254),
  role: z.enum(["admin", "employee"], { error: "Elegí un rol" }),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}
