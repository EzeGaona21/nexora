"use client";

import { ArrowUp, Database, History, MessageSquarePlus, Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { askAssistant, deleteConversation } from "@/actions/ai";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/primitives";
import { EASE_OUT, listItem, stagger, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

const SUGGESTIONS = [
  "¿Cuánto vendí este mes?",
  "¿Qué productos generan más ganancias?",
  "¿Qué productos debería reponer?",
  "¿Qué productos están perdiendo rentabilidad?",
  "¿Cómo evolucionaron mis ventas?",
  "¿Qué gastos puedo revisar?",
  "¿Qué tendencia muestran mis ventas?",
  "¿Qué productos están quedando estancados?",
];

const TOOL_LABELS: Record<string, string> = {
  resumen_ventas: "Ventas",
  evolucion_ventas: "Evolución de ventas",
  rendimiento_productos: "Rendimiento de productos",
  estado_inventario: "Inventario",
  resumen_gastos: "Gastos",
  metodos_de_pago: "Métodos de pago",
  prediccion_ventas: "Modelo de predicción",
  alertas_activas: "Alertas",
};

// ── Render mínimo y seguro de la respuesta (negritas y listas, sin HTML) ──
function inline(raw: string): ReactNode {
  // Espacio duro entre "$" y la cifra: el importe nunca se parte en dos renglones.
  const text = raw.replace(/\$ (?=\d)/g, "$\u00a0");
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-fg">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function RichText({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={cn("flex flex-col gap-1.5 pl-5 marker:text-subtle", list.ordered ? "list-decimal" : "list-disc")}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flush();
      if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-fg/90">{blocks}</div>;
}

function AssistantMark({ pulse = false }: { pulse?: boolean }) {
  return (
    <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand-bright">
      {pulse ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-lg border border-brand/40"
          animate={{ opacity: [0.7, 0], scale: [1, 1.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
      <Sparkles className="size-3.5" aria-hidden />
    </span>
  );
}

function Thinking() {
  return (
    <motion.div
      className="flex items-center gap-3"
      variants={listItem}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="status"
      aria-label="NEXORA AI está consultando tus datos"
    >
      <AssistantMark pulse />
      <span className="flex items-center gap-2 text-sm text-muted">
        Consultando tus datos
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1 rounded-full bg-brand-bright"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </span>
      </span>
    </motion.div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onDelete,
  onNavigate,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onDelete: (id: string) => void;
  onNavigate?: () => void;
}) {
  if (conversations.length === 0) {
    return <p className="px-3 py-6 text-center text-[13px] text-subtle">Tus conversaciones van a aparecer acá.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      <AnimatePresence initial={false}>
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <motion.li key={c.id} layout variants={listItem} initial="hidden" animate="visible" exit="exit" className="group relative">
              <Link
                href={`/asistente?c=${c.id}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block truncate rounded-lg py-2 pl-3 pr-9 text-[13px] transition-colors duration-150",
                  active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                )}
              >
                {c.title}
              </Link>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
                aria-label={`Eliminar la conversación "${c.title}"`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function AssistantView({
  conversations,
  activeId,
  initialMessages,
  quota,
  configured,
  persistent,
  firstName,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  initialMessages: ChatMessage[];
  quota: { used: number; limit: number; perDay: boolean };
  /** Hay proveedor de IA configurado en el servidor. */
  configured: boolean;
  /** false en la demo: el historial vive solo en esta pestaña. */
  persistent: boolean;
  firstName: string;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(activeId);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [remaining, setRemaining] = useState(Math.max(0, quota.limit - quota.used));
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentId = useRef(activeId);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cambio de conversación desde el historial: se cargan sus mensajes.
  useEffect(() => {
    if (activeId === currentId.current) return;
    currentId.current = activeId;
    setConversationId(activeId);
    setMessages(initialMessages);
  }, [activeId, initialMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending]);

  // El campo crece con el texto hasta un máximo.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: message }]);
    setDraft("");
    setPending(true);

    const result = await askAssistant({ conversationId, message, history: persistent ? [] : history.slice(-16) });
    setPending(false);

    if (!result.ok || !result.data) {
      toast.error(result.ok ? "No pudimos obtener una respuesta." : result.error);
      // Se devuelve el texto al campo para no perder la consulta.
      setMessages((prev) => prev.slice(0, -1));
      setDraft(message);
      return;
    }
    const { reply, toolsUsed, remaining: left, conversationId: id } = result.data;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply, toolsUsed }]);
    setRemaining(left);
    if (id && id !== conversationId) {
      currentId.current = id;
      setConversationId(id);
      window.history.replaceState(null, "", `/asistente?c=${id}`);
      router.refresh();
    }
  }

  async function remove(id: string) {
    const result = await deleteConversation(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Conversación eliminada");
    if (id === conversationId) router.push("/asistente");
    else router.refresh();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  const exhausted = remaining <= 0;
  const disabled = !configured || exhausted;
  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] gap-5 lg:h-[calc(100dvh-4rem)]">
      {/* Historial · desktop */}
      {persistent ? (
        <aside className="card hidden w-64 shrink-0 flex-col overflow-hidden lg:flex">
          <div className="p-3">
            <Link href="/asistente" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
              <MessageSquarePlus aria-hidden />
              Nueva conversación
            </Link>
          </div>
          <p className="px-4 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Historial</p>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <ConversationList conversations={conversations} activeId={conversationId} onDelete={remove} />
          </div>
        </aside>
      ) : null}

      {/* Conversación */}
      <section className="card relative flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Conversación con NEXORA AI">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(139_92_246/0.09),transparent)]"
        />

        <header className="relative flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <AssistantMark />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-fg">NEXORA AI</h1>
              <p className="truncate text-xs text-subtle">Responde con los datos reales de tu comercio</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={exhausted ? "warning" : "neutral"}>
              <span className="num">{remaining}</span> {quota.perDay ? "consultas hoy" : "consultas este mes"}
            </Badge>
            {persistent ? (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setHistoryOpen(true)}
                aria-label="Ver historial de conversaciones"
              >
                <History />
              </Button>
            ) : null}
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {empty ? (
            <motion.div
              className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center text-center"
              variants={stagger(0.05, 0.05)}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={listItem} className="relative mb-5">
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-brand/25 blur-xl" />
                <span className="relative flex size-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand-deep/60 text-brand-bright">
                  <Sparkles className="size-5" aria-hidden />
                </span>
              </motion.div>
              <motion.h2 variants={listItem} className="text-2xl font-semibold tracking-tight text-fg">
                Hola, {firstName}. ¿Qué querés saber de tu negocio?
              </motion.h2>
              <motion.p variants={listItem} className="mt-2 max-w-md text-sm text-muted">
                Consulto tus ventas, productos, gastos y predicciones antes de responder. Si no hay datos suficientes, te lo digo.
              </motion.p>
              <motion.ul variants={listItem} className="mt-7 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <motion.button
                      type="button"
                      disabled={disabled || pending}
                      onClick={() => void send(s)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      transition={transitions.fast}
                      className="cursor-pointer rounded-full border border-border bg-bg/60 px-3.5 py-2 text-[13px] text-muted transition-colors duration-150 hover:border-brand/40 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {s}
                    </motion.button>
                  </li>
                ))}
              </motion.ul>
              {!persistent ? (
                <motion.p variants={listItem} className="mt-6 text-xs text-subtle">
                  En la demo las conversaciones no se guardan: se pierden al salir de esta página.
                </motion.p>
              ) : null}
            </motion.div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((m) =>
                  m.role === "user" ? (
                    <motion.div
                      key={m.id}
                      className="flex justify-end"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                    >
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border bg-raised px-4 py-2.5 text-[15px] leading-relaxed text-fg">
                        {m.content}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={m.id}
                      className="flex gap-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT }}
                    >
                      <AssistantMark />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <RichText content={m.content} />
                        {m.toolsUsed && m.toolsUsed.length > 0 ? (
                          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                            <Database className="size-3" aria-hidden />
                            Datos consultados:
                            {m.toolsUsed.map((t) => (
                              <span key={t} className="rounded-md border border-border bg-bg px-1.5 py-0.5 text-muted">
                                {TOOL_LABELS[t] ?? t}
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  ),
                )}
                {pending ? <Thinking key="thinking" /> : null}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="relative border-t border-border p-3 sm:p-4">
          {!configured ? (
            <p role="status" className="mx-auto mb-3 max-w-3xl rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              NEXORA AI no está conectado en este entorno. Definí AI_API_KEY y AI_MODEL en el servidor (ver README) para activarlo.
            </p>
          ) : exhausted ? (
            <p role="status" className="mx-auto mb-3 max-w-3xl rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              {quota.perDay
                ? "La demo alcanzó el máximo de consultas de hoy."
                : "Alcanzaste el máximo de consultas de tu plan para este mes."}{" "}
              <Link href="/precios" className="font-medium text-fg underline underline-offset-4">
                Ver planes
              </Link>
            </p>
          ) : null}
          <form
            onSubmit={onSubmit}
            className="glass mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border p-2 transition-[border-color,box-shadow] duration-200 focus-within:border-brand/50 focus-within:shadow-glow"
          >
            <label htmlFor="ai-input" className="sr-only">
              Escribí tu consulta
            </label>
            <textarea
              id="ai-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={2000}
              disabled={disabled}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Preguntá por tus ventas, productos, gastos o stock…"
              className="max-h-42 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-fg placeholder:text-subtle focus:outline-none disabled:cursor-not-allowed"
            />
            <motion.button
              type="submit"
              disabled={disabled || pending || draft.trim().length === 0}
              whileTap={{ scale: 0.92 }}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-brand text-bg transition-colors duration-150 hover:bg-brand-bright disabled:cursor-not-allowed disabled:bg-raised disabled:text-subtle"
              aria-label="Enviar consulta"
            >
              <ArrowUp className="size-4.5" aria-hidden />
            </motion.button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-subtle">
            Las predicciones son estimaciones. Verificá las decisiones importantes en Reportes.
          </p>
        </div>
      </section>

      <Modal open={historyOpen} onOpenChange={setHistoryOpen} title="Historial" size="sm">
        <Link
          href="/asistente"
          onClick={() => setHistoryOpen(false)}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mb-3 w-full")}
        >
          <MessageSquarePlus aria-hidden />
          Nueva conversación
        </Link>
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          onDelete={remove}
          onNavigate={() => setHistoryOpen(false)}
        />
      </Modal>
    </div>
  );
}
