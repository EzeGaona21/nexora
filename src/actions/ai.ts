"use server";

import { revalidatePath } from "next/cache";

import { buildSystemPrompt } from "@/lib/ai/prompt";
import { AiProviderError, isAiConfigured, runAssistant, type ChatTurn } from "@/lib/ai/provider";
import { AI_TOOLS, runAiTool } from "@/lib/ai/tools";
import { dbErrorMessage, getSessionContext } from "@/lib/auth/session";
import { todayAR } from "@/lib/dates";
import type { ActionResult } from "@/lib/utils";
import { aiMessageSchema, firstIssue, type AiMessageInput } from "@/lib/validations/schemas";

/** Turnos previos que se le envían al modelo (acota costo y contexto). */
const HISTORY_TURNS = 16;

export interface AiReply {
  conversationId: string | null;
  reply: string;
  toolsUsed: string[];
  remaining: number;
}

export async function askAssistant(input: AiMessageInput): Promise<ActionResult<AiReply>> {
  const ctx = await getSessionContext();

  const parsed = aiMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { message } = parsed.data;

  if (!isAiConfigured) {
    return {
      ok: false,
      error:
        "NEXORA AI todavía no está configurado en este entorno. Falta definir AI_API_KEY y AI_MODEL en el servidor.",
    };
  }

  // Cupo del plan: se reserva de forma atómica antes de llamar al proveedor.
  const { data: remaining, error: quotaError } = await ctx.supabase.rpc("ai_consume", { p_org: ctx.org.id });
  if (quotaError) return { ok: false, error: dbErrorMessage(quotaError) };
  if (typeof remaining !== "number" || remaining < 0) {
    return {
      ok: false,
      error: ctx.org.is_demo
        ? "La demo alcanzó el máximo de consultas de hoy. Creá tu cuenta para seguir usando NEXORA AI."
        : "Alcanzaste el máximo de consultas de IA de tu plan para este mes.",
    };
  }

  // Historial: guardado en la base para cuentas reales; en memoria del
  // navegador para la demo, que es de solo lectura.
  let conversationId = ctx.canWrite ? parsed.data.conversationId : null;
  let turns: ChatTurn[] = [];

  if (ctx.canWrite) {
    if (conversationId) {
      const { data, error } = await ctx.supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .eq("org_id", ctx.org.id)
        .order("created_at", { ascending: false })
        .limit(HISTORY_TURNS);
      if (error) return { ok: false, error: dbErrorMessage(error) };
      // RLS: si la conversación no es del usuario, no hay filas.
      if (!data || data.length === 0) return { ok: false, error: "No encontramos esa conversación." };
      turns = data.reverse().map((m) => ({ role: m.role as ChatTurn["role"], content: String(m.content) }));
    } else {
      const { data, error } = await ctx.supabase
        .from("ai_conversations")
        .insert({ org_id: ctx.org.id, user_id: ctx.user.id, title: message.slice(0, 80) })
        .select("id")
        .single();
      if (error) return { ok: false, error: dbErrorMessage(error) };
      conversationId = String(data.id);
    }
    const { error } = await ctx.supabase
      .from("ai_messages")
      .insert({ org_id: ctx.org.id, conversation_id: conversationId, role: "user", content: message });
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    turns = parsed.data.history.slice(-HISTORY_TURNS);
  }

  // La API exige que el primer turno sea del usuario.
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();
  turns.push({ role: "user", content: message });

  let run;
  try {
    run = await runAssistant(
      buildSystemPrompt({
        orgName: ctx.org.name,
        businessType: ctx.org.business_type,
        today: todayAR(),
        userName: ctx.user.name,
      }),
      turns,
      AI_TOOLS,
      // El comercio sale de la sesión verificada, nunca de lo que diga el modelo.
      (name, args) => runAiTool(ctx, name, args),
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AiProviderError ? error.message : "No pudimos obtener una respuesta. Probá de nuevo.",
    };
  }

  const reply = run.text.slice(0, 20000);
  if (ctx.canWrite && conversationId) {
    await ctx.supabase
      .from("ai_messages")
      .insert({ org_id: ctx.org.id, conversation_id: conversationId, role: "assistant", content: reply });
    await ctx.supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("org_id", ctx.org.id);
    revalidatePath("/asistente");
  }

  return {
    ok: true,
    data: { conversationId, reply, toolsUsed: [...new Set(run.toolsUsed)], remaining },
  };
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Conversación inválida." };
  const { error } = await ctx.supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("org_id", ctx.org.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/asistente");
  return { ok: true };
}
