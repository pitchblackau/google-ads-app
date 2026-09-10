import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { fetchChatSnapshot, runChatQuery } from "@/lib/google-ads";
import {
  CHAT_MODES,
  CHAT_SYSTEM_PROMPT,
  CHAT_TOOLS,
  ChatMode,
  stripDeclinedPartial,
  usageCostUsd,
} from "@/lib/chat";

export const maxDuration = 300;

const getCachedSnapshot = unstable_cache(async (id: string) => fetchChatSnapshot(id), ["chat-snapshot"], {
  revalidate: 300,
});

const LIMIT_NOTE =
  "Query limit for this question reached. Answer now with the data gathered so far, without calling more tools.";

function errorText(err: unknown): string {
  const e = err as { errors?: { message?: string }[]; message?: string };
  return e?.errors?.map((x) => x.message).filter(Boolean).join("; ") || e?.message || String(err);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Invalid account ID" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }
  if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    return Response.json({ error: "Chat needs live Google Ads credentials." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const mode: ChatMode = body?.mode === "deep" ? "deep" : "quick";
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const history: Anthropic.Beta.BetaMessageParam[] = Array.isArray(body?.history) ? body.history : [];
  if (!question || question.length > 4000) {
    return Response.json({ error: "Question must be between 1 and 4000 characters." }, { status: 400 });
  }

  const cfg = CHAT_MODES[mode];
  const fallback =
    mode === "deep" ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};
  const client = new Anthropic();
  const encoder = new TextEncoder();
  let open = true;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false;
        }
      };

      const newMessages: Anthropic.Beta.BetaMessageParam[] = [];
      let costUsd = 0;
      let servedBy: string = cfg.model;

      try {
        const questionBlock = { type: "text" as const, text: question };
        if (history.length === 0) {
          send({ type: "status", text: "Loading account snapshot…" });
          const snapshot = await getCachedSnapshot(id);
          newMessages.push({ role: "user", content: [{ type: "text", text: snapshot }, questionBlock] });
        } else {
          newMessages.push({ role: "user", content: [questionBlock] });
        }

        for (let round = 0; ; round++) {
          const messageStream = client.beta.messages.stream({
            model: cfg.model,
            max_tokens: 64000,
            thinking: { type: "adaptive" },
            output_config: { effort: cfg.effort },
            system: [{ type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            tools: CHAT_TOOLS,
            cache_control: { type: "ephemeral" },
            messages: [...history, ...newMessages],
            ...fallback,
          });
          messageStream.on("text", (text) => send({ type: "text", text }));
          const message = await messageStream.finalMessage();
          servedBy = message.model;
          costUsd += usageCostUsd(message.model, cfg.model, message.usage);

          if (message.stop_reason === "refusal") {
            send({ type: "error", message: "Claude declined this request. Try rephrasing the question." });
            return;
          }

          const content = stripDeclinedPartial(message.content);
          newMessages.push({ role: "assistant", content });
          if (message.stop_reason !== "tool_use") break;

          const toolUses = content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          const overLimit = round >= cfg.maxToolRounds;
          if (!overLimit) {
            send({
              type: "status",
              text: toolUses.length > 1 ? `Running ${toolUses.length} Google Ads queries…` : "Querying Google Ads…",
            });
          }

          const results = await Promise.all(
            toolUses.map(async (tool): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
              if (overLimit) {
                return { type: "tool_result", tool_use_id: tool.id, content: "Not run: query limit reached.", is_error: true };
              }
              try {
                const { query } = tool.input as { query: string };
                return { type: "tool_result", tool_use_id: tool.id, content: await runChatQuery(id, query) };
              } catch (err) {
                return { type: "tool_result", tool_use_id: tool.id, content: `Query failed: ${errorText(err)}`, is_error: true };
              }
            }),
          );

          const userContent: (Anthropic.Beta.BetaToolResultBlockParam | Anthropic.Beta.BetaTextBlockParam)[] = results;
          if (round === cfg.maxToolRounds - 1) userContent.push({ type: "text", text: LIMIT_NOTE });
          newMessages.push({ role: "user", content: userContent });
          if (overLimit) {
            send({ type: "status", text: "Stopped: query limit reached." });
            break;
          }
        }

        send({ type: "done", messages: newMessages, model: servedBy, costUsd });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Anthropic.APIError ? `Claude API error (${err.status}): ${err.message}` : errorText(err),
        });
      } finally {
        if (open) controller.close();
      }
    },
    cancel() {
      open = false;
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
