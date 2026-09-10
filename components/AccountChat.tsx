"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import type { ChatMode } from "@/lib/chat";

const MODE_INFO: Record<ChatMode, { label: string; model: string; hint: string }> = {
  quick: { label: "Quick", model: "Sonnet 5", hint: "Faster and cheaper, good for most questions" },
  deep: { label: "Deep", model: "Opus 5", hint: "Slower and pricier, for in-depth analysis" },
};

const MODEL_NAMES: Record<string, string> = {
  "claude-sonnet-5": "Sonnet 5",
  "claude-opus-5": "Opus 5",
  "claude-opus-4-8": "Opus 4.8",
};

interface UserItem {
  role: "user";
  text: string;
}
interface AssistantItem {
  role: "assistant";
  text: string;
  pending: boolean;
  status?: string;
  error?: string;
  meta?: string;
}
type ChatItem = UserItem | AssistantItem;

type ChatEvent =
  | { type: "text"; text: string }
  | { type: "status"; text: string }
  | { type: "done"; messages: unknown[]; model: string; costUsd: number }
  | { type: "error"; message: string };

function formatCost(usd: number) {
  if (usd < 0.01) return "<1¢";
  if (usd < 1) return `${(usd * 100).toFixed(1)}¢`;
  return `$${usd.toFixed(2)}`;
}

const MARKDOWN: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  h1: ({ children }) => <p className="mb-1 mt-3 font-bold text-white first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-1 mt-3 font-bold text-white first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-1 mt-3 font-semibold text-white first:mt-0">{children}</p>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap border-b border-[#1e1e2e] px-2 py-1 text-left font-semibold text-[#8b8b9a]">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-[#1e1e2e]/60 px-2 py-1 tabular-nums">{children}</td>,
  code: ({ children }) => <code className="rounded bg-[#1e1e2e] px-1 py-0.5 text-[12px]">{children}</code>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00fff9] underline">
      {children}
    </a>
  ),
};

function Spinner() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}

export default function AccountChat({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [mode, setMode] = useState<ChatMode>("quick");
  const [items, setItems] = useState<ChatItem[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [items]);

  function updateAnswer(fn: (item: AssistantItem) => AssistantItem) {
    setItems((prev) => {
      const next = [...prev];
      next[next.length - 1] = fn(next[next.length - 1] as AssistantItem);
      return next;
    });
  }

  async function ask() {
    const question = input.trim();
    if (!question || busy) return;
    const askedMode = mode;
    const started = Date.now();
    setInput("");
    setBusy(true);
    setItems((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "assistant", text: "", pending: true, status: "Thinking…" },
    ]);

    try {
      const res = await fetch(`/api/account/${accountId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: askedMode, question, history }),
      });
      if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("ndjson")) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Unexpected response (${res.status}). Try signing in again.`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === "text") {
            updateAnswer((a) => ({
              ...a,
              text: a.status && a.text ? `${a.text}\n\n${event.text}` : a.text + event.text,
              status: undefined,
            }));
          } else if (event.type === "status") {
            updateAnswer((a) => ({ ...a, status: event.text }));
          } else if (event.type === "done") {
            setHistory((prev) => [...prev, ...event.messages]);
            setTotalCost((c) => c + event.costUsd);
            const seconds = Math.round((Date.now() - started) / 1000);
            updateAnswer((a) => ({
              ...a,
              pending: false,
              status: undefined,
              meta: `${MODE_INFO[askedMode].label} · ${MODEL_NAMES[event.model] ?? event.model} · ${formatCost(event.costUsd)} · ${seconds}s`,
            }));
          } else if (event.type === "error") {
            updateAnswer((a) => ({ ...a, pending: false, status: undefined, error: event.message }));
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      updateAnswer((a) => ({ ...a, pending: false, status: undefined, error: message }));
    } finally {
      setBusy(false);
      updateAnswer((a) =>
        a.pending ? { ...a, pending: false, status: undefined, error: "Connection closed before the answer finished." } : a,
      );
    }
  }

  function clear() {
    setItems([]);
    setHistory([]);
    setTotalCost(0);
  }

  return (
    <div className="flex flex-col rounded-lg border border-[#1e1e2e] bg-[#0d0d18]">
      <div className="flex items-center justify-between gap-2 border-b border-[#1e1e2e] px-2 py-2 sm:px-3">
        <div role="radiogroup" aria-label="Answer mode" className="flex items-center gap-0.5 rounded-lg bg-[#08080f] p-0.5">
          {(Object.keys(MODE_INFO) as ChatMode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              disabled={busy}
              onClick={() => setMode(m)}
              title={MODE_INFO[m].hint}
              className={clsx(
                "rounded-md px-3 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed",
                mode === m
                  ? m === "quick"
                    ? "bg-[#00fff9]/10 text-[#00fff9]"
                    : "bg-[#7c6aff]/15 text-[#a99bff]"
                  : "text-[#6b7280] hover:text-[#a0a8c0]",
              )}
            >
              {MODE_INFO[m].label}
              <span className="hidden font-normal opacity-60 sm:inline"> · {MODE_INFO[m].model}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#4e4e63]">
          {totalCost > 0 && (
            <span title="Estimated Claude API cost for this conversation (USD)">Chat total {formatCost(totalCost)}</span>
          )}
          {items.length > 0 && (
            <button onClick={clear} disabled={busy} className="hover:text-white disabled:opacity-40">
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex max-h-[60vh] min-h-[160px] flex-col gap-3 overflow-y-auto px-3 py-3">
        {items.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[#4e4e63]">
            Ask anything about {accountName || "this account"}, for example &ldquo;Why did conversions drop last
            week?&rdquo; or &ldquo;Which search terms are wasting spend?&rdquo;
          </p>
        )}
        {items.map((item, i) =>
          item.role === "user" ? (
            <div
              key={i}
              className="max-w-[85%] self-end whitespace-pre-wrap rounded-lg rounded-br-sm border border-[#00fff9]/20 bg-[#00fff9]/10 px-3 py-2 text-[13px] text-white"
            >
              {item.text}
            </div>
          ) : (
            <div key={i} className="flex w-full flex-col gap-1.5">
              {item.text && (
                <div className="text-[13px] leading-relaxed text-[#d4d4e0]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
                    {item.text}
                  </ReactMarkdown>
                </div>
              )}
              {item.status && (
                <p className="flex items-center gap-2 text-[11px] text-[#6b7280]">
                  <Spinner />
                  {item.status}
                </p>
              )}
              {item.error && <p className="text-[11px] text-red-400">{item.error}</p>}
              {item.meta && <p className="text-[10px] text-[#4e4e63]">{item.meta}</p>}
            </div>
          ),
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex items-end gap-2 border-t border-[#1e1e2e] p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          rows={2}
          placeholder="Ask about this account…"
          className="flex-1 resize-none rounded-md border border-[#1e1e2e] bg-[#08080f] px-3 py-2 text-base text-white placeholder-[#3a3a50] outline-none focus:border-[#00fff9]/40 md:text-[13px]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md border border-[#00fff9]/30 bg-[#00fff9]/10 px-3 py-2 text-[12px] font-semibold text-[#00fff9] transition hover:bg-[#00fff9]/20 disabled:opacity-40"
        >
          {busy ? <Spinner /> : "Send"}
        </button>
      </form>
    </div>
  );
}
