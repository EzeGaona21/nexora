import type { Metadata } from "next";

import { AssistantView, type ChatMessage, type ConversationSummary } from "@/components/ai/assistant-view";
import { isAiConfigured } from "@/lib/ai/provider";
import { getSessionContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "NEXORA AI" };

// Una respuesta puede encadenar varias consultas al modelo y a la base.
export const maxDuration = 60;

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  const requested = /^[0-9a-f-]{36}$/i.test(params.c ?? "") ? (params.c as string) : null;

  const [conversationsRes, quotaRes, messagesRes] = await Promise.all([
    ctx.supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("org_id", ctx.org.id)
      .order("updated_at", { ascending: false })
      .limit(40),
    ctx.supabase.rpc("ai_quota", { p_org: ctx.org.id }),
    requested
      ? ctx.supabase
          .from("ai_messages")
          .select("id, role, content")
          .eq("conversation_id", requested)
          .eq("org_id", ctx.org.id)
          .order("created_at", { ascending: true })
          .limit(200)
      : null,
  ]);
  if (conversationsRes.error) throw new Error(conversationsRes.error.message);
  if (quotaRes.error) throw new Error(quotaRes.error.message);
  if (messagesRes?.error) throw new Error(messagesRes.error.message);
  const storedMessages = (messagesRes?.data ?? []) as { id: string; role: string; content: string }[];

  const conversations: ConversationSummary[] = (conversationsRes.data ?? []).map((c) => ({
    id: String(c.id),
    title: String(c.title),
    updatedAt: String(c.updated_at),
  }));
  // RLS: una conversación ajena o inexistente simplemente no trae mensajes.
  const activeId = requested && conversations.some((c) => c.id === requested) ? requested : null;
  const initialMessages: ChatMessage[] = activeId
    ? storedMessages.map((m) => ({
        id: String(m.id),
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content),
      }))
    : [];

  const quotaRow = (Array.isArray(quotaRes.data) ? quotaRes.data[0] : quotaRes.data) as
    | { used: number; quota: number; per_day: boolean }
    | undefined;

  return (
    <AssistantView
      conversations={conversations}
      activeId={activeId}
      initialMessages={initialMessages}
      quota={{
        used: Number(quotaRow?.used ?? 0),
        limit: Number(quotaRow?.quota ?? 0),
        perDay: Boolean(quotaRow?.per_day),
      }}
      configured={isAiConfigured}
      persistent={ctx.canWrite}
      firstName={ctx.user.name.split(" ")[0]}
    />
  );
}
