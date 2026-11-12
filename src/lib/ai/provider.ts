import "server-only";

import type { AiTool } from "@/lib/ai/tools";

/**
 * Cliente de IA configurable por variables de entorno (solo servidor):
 *   AI_PROVIDER = anthropic | openai   (openai = cualquier API compatible con Chat Completions)
 *   AI_API_KEY, AI_MODEL, AI_BASE_URL (opcional)
 * Se usa fetch directo: sin SDK, la clave nunca sale del servidor.
 * El ciclo es el estándar de "tool use": el modelo pide herramientas, el
 * backend las ejecuta y le devuelve el resultado hasta que redacta la respuesta.
 */

const provider = process.env.AI_PROVIDER === "openai" ? "openai" : "anthropic";
const apiKey = process.env.AI_API_KEY ?? "";
const model = process.env.AI_MODEL ?? "";
const baseUrl = (
  process.env.AI_BASE_URL ?? (provider === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com/v1")
).replace(/\/$/, "");

export const isAiConfigured = Boolean(apiKey && model);

const MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 1200;
const REQUEST_TIMEOUT_MS = 45_000;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantRun {
  text: string;
  /** Herramientas consultadas, en orden (para mostrar "fuentes" en la interfaz). */
  toolsUsed: string[];
}

export class AiProviderError extends Error {}

type ToolRunner = (name: string, input: unknown) => Promise<string>;

async function post(path: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new AiProviderError("El servicio de IA no respondió a tiempo.");
  }
  if (!response.ok) {
    // El detalle queda en los logs del servidor; al usuario no se le filtra nada del proveedor.
    console.error("[nexora-ai] proveedor respondió", response.status, (await response.text()).slice(0, 500));
    throw new AiProviderError(
      response.status === 401 || response.status === 403
        ? "La clave de IA configurada no es válida."
        : response.status === 429
          ? "El servicio de IA está saturado. Probá de nuevo en un momento."
          : "El servicio de IA devolvió un error.",
    );
  }
  return (await response.json()) as Record<string, unknown>;
}

// ── Anthropic Messages API ─────────────────────────────────────────
interface AnthropicBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

async function runAnthropic(system: string, turns: ChatTurn[], tools: AiTool[], runTool: ToolRunner): Promise<AssistantRun> {
  const messages: { role: "user" | "assistant"; content: unknown }[] = turns.map((t) => ({
    role: t.role,
    content: t.content,
  }));
  const toolsUsed: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const data = await post(
      "/messages",
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      {
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
        tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
      },
    );
    const blocks = (Array.isArray(data.content) ? data.content : []) as AnthropicBlock[];
    const calls = blocks.filter((b) => b.type === "tool_use" && b.id && b.name);

    if (data.stop_reason !== "tool_use" || calls.length === 0) {
      const text = blocks
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new AiProviderError("El servicio de IA devolvió una respuesta vacía.");
      return { text, toolsUsed };
    }

    messages.push({ role: "assistant", content: blocks });
    const results = await Promise.all(
      calls.map(async (call) => {
        toolsUsed.push(call.name as string);
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content: await runTool(call.name as string, call.input),
        };
      }),
    );
    messages.push({ role: "user", content: results });
  }
  throw new AiProviderError("La consulta necesitó demasiados pasos. Probá con una pregunta más acotada.");
}

// ── API compatible con OpenAI Chat Completions ─────────────────────
interface OpenAiToolCall {
  id: string;
  function: { name: string; arguments: string };
}

async function runOpenAi(system: string, turns: ChatTurn[], tools: AiTool[], runTool: ToolRunner): Promise<AssistantRun> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: system },
    ...turns.map((t) => ({ role: t.role, content: t.content })),
  ];
  const toolsUsed: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const data = await post(
      "/chat/completions",
      { authorization: `Bearer ${apiKey}` },
      {
        model,
        messages,
        tools: tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      },
    );
    const choices = (Array.isArray(data.choices) ? data.choices : []) as { message?: Record<string, unknown> }[];
    const message = choices[0]?.message;
    if (!message) throw new AiProviderError("El servicio de IA devolvió una respuesta vacía.");
    const calls = (Array.isArray(message.tool_calls) ? message.tool_calls : []) as OpenAiToolCall[];

    if (calls.length === 0) {
      const text = typeof message.content === "string" ? message.content.trim() : "";
      if (!text) throw new AiProviderError("El servicio de IA devolvió una respuesta vacía.");
      return { text, toolsUsed };
    }

    messages.push(message);
    for (const call of calls) {
      toolsUsed.push(call.function.name);
      let args: unknown = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // Argumentos mal formados: la herramienta valida y devuelve el error al modelo.
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: await runTool(call.function.name, args),
      });
    }
  }
  throw new AiProviderError("La consulta necesitó demasiados pasos. Probá con una pregunta más acotada.");
}

export function runAssistant(system: string, turns: ChatTurn[], tools: AiTool[], runTool: ToolRunner): Promise<AssistantRun> {
  if (!isAiConfigured) throw new AiProviderError("NEXORA AI no está configurado.");
  return provider === "openai"
    ? runOpenAi(system, turns, tools, runTool)
    : runAnthropic(system, turns, tools, runTool);
}
