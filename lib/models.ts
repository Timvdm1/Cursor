import type { CrewState, Message } from "./types";
import { decryptSecret } from "./crypto";
import {
  envKeyForProvider,
  FREE_LLM_PROVIDER_IDS,
  isFreeLlmProvider,
  providerMeta,
  type FreeLlmProviderId,
} from "./providers";
import type { AgentEvent } from "./orchestrator";

export type ResolvedModel = {
  provider: FreeLlmProviderId | "crew-local";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  error?: string;
};

export type ChatCompletion = { text: string; model: string; provider: FreeLlmProviderId };

type FetchLike = typeof fetch;

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function modelsFor(provider: FreeLlmProviderId, preferred?: string): string[] {
  const meta = providerMeta(provider);
  return unique([preferred, meta.defaultModel, ...meta.fallbackModels].filter(Boolean) as string[]);
}

function connectedOrder(state: CrewState, preferred = "auto"): FreeLlmProviderId[] {
  const saved = state.keys.map((k) => k.provider).filter(isFreeLlmProvider);
  const head: FreeLlmProviderId[] = [];
  if (preferred !== "auto" && isFreeLlmProvider(preferred)) head.push(preferred);
  else if (saved.length) head.push(saved[saved.length - 1]);
  return unique([...head, ...saved.slice().reverse(), ...FREE_LLM_PROVIDER_IDS]);
}

function keyFor(state: CrewState, provider: FreeLlmProviderId): { apiKey?: string; error?: string } {
  const row = state.keys.find((k) => k.provider === provider);
  if (row) {
    try {
      return { apiKey: decryptSecret(row.ciphertext) };
    } catch {
      return { error: `Could not decrypt the ${providerMeta(provider).label} key. Reconnect it in Settings → Usage & Billing.` };
    }
  }
  const env = envKeyForProvider(provider);
  return env ? { apiKey: env } : {};
}

export function resolveModel(state: CrewState, preferred = "auto"): ResolvedModel {
  let decryptError: string | undefined;
  for (const p of connectedOrder(state, preferred)) {
    const got = keyFor(state, p);
    if (got.error) {
      decryptError = got.error;
      continue;
    }
    if (!got.apiKey) continue;
    const meta = providerMeta(p);
    return { provider: p, model: meta.defaultModel, apiKey: got.apiKey, baseUrl: meta.baseUrl };
  }
  return { provider: "crew-local", model: "crew-local", error: decryptError };
}

export function activeLlmSummary(state: CrewState): { provider: FreeLlmProviderId; label: string; model: string } | null {
  const resolved = resolveModel(state);
  if (resolved.provider === "crew-local" || !resolved.apiKey) return null;
  return { provider: resolved.provider, label: providerMeta(resolved.provider).label, model: resolved.model };
}

export function chatHistory(messages: Message[], conversationId: string): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.conversationId === conversationId && m.kind === "text" && (m.role === "user" || m.role === "assistant"))
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));
}

export function applyLlmToEvents(
  events: AgentEvent[],
  completion: ChatCompletion,
): AgentEvent[] {
  const next = events.map((e) => ({ ...e }));
  const lastText = [...next].reverse().find((e) => e.type === "text");
  if (lastText && lastText.type === "text") lastText.text = completion.text;
  else next.push({ type: "text", text: completion.text });
  next.unshift({
    type: "trace",
    text: `Replied with ${providerMeta(completion.provider).label} · ${completion.model}`,
  });
  return next;
}

export function applyProviderError(events: AgentEvent[], message: string): AgentEvent[] {
  const next = events.map((e) => ({ ...e }));
  const text = `I couldn't use your connected API key.\n\n${message}`;
  const lastText = [...next].reverse().find((e) => e.type === "text");
  if (lastText && lastText.type === "text") lastText.text = text;
  else next.push({ type: "text", text });
  next.unshift({ type: "trace", text: "Provider call failed" });
  return next;
}

function isRetryableModelError(message: string): boolean {
  return /404|not found|unknown model|does not exist|no longer|decommissioned|model_not_found|invalid_model/i.test(
    message,
  );
}

function isRateLimitError(message: string): boolean {
  return /429|rate limit|too many requests|rate_limited|resource.?exhausted|quota/i.test(message);
}

function isAuthFailure(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  return /invalid api key|api[_ ]key[_ ]invalid|incorrect api key|unauthorized|authentication|permission_denied/i.test(
    body,
  );
}

function formatHttpError(status: number, body: string): string {
  const clipped = body.replace(/\s+/g, " ").trim().slice(0, 280);
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string; code?: number | string; status?: string } | string;
      message?: string;
      type?: string;
    };
    const msg =
      typeof json.error === "string"
        ? json.error
        : json.error?.message || json.message;
    if (msg) return `${status}: ${msg}`;
  } catch {
    /* raw body */
  }
  return `${status}: ${clipped || "provider error"}`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export function authHeaders(provider: FreeLlmProviderId, apiKey: string): Record<string, string> {
  if (provider === "openrouter") {
    return {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.CREW_PUBLIC_URL || "https://crew.app",
      "X-Title": "Crew",
    };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

/** Cheap key check: list models. 429 means the key is valid but the free tier is busy. */
export async function verifyApiKey(
  provider: FreeLlmProviderId,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: true; model: string; rateLimited?: boolean }> {
  const meta = providerMeta(provider);
  const url =
    provider === "google"
      ? `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      : `${(meta.baseUrl || "").replace(/\/$/, "")}/models`;
  const res = await fetchImpl(url, {
    method: "GET",
    headers: provider === "google" ? { "Content-Type": "application/json" } : authHeaders(provider, apiKey),
  });
  const body = await res.text();
  if (res.ok) return { ok: true, model: meta.defaultModel };
  if (res.status === 429 || isRateLimitError(body)) {
    return { ok: true, model: meta.defaultModel, rateLimited: true };
  }
  if (isAuthFailure(res.status, body)) {
    throw new Error(`${meta.label} rejected this key. Check it in their dashboard and try again.`);
  }
  throw new Error(formatHttpError(res.status, body));
}

export async function completeChat(
  resolved: ResolvedModel,
  messages: { role: string; content: string }[],
  fetchImpl: FetchLike = fetch,
): Promise<ChatCompletion> {
  if (resolved.provider === "crew-local" || !resolved.apiKey) {
    throw new Error(resolved.error || "No LLM key connected. Add one in Settings → Usage & Billing.");
  }
  const provider = resolved.provider;
  const models = modelsFor(provider, resolved.model);
  let lastError = "Provider returned an empty reply.";
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const extraHeaders = provider === "openrouter" ? authHeaders(provider, resolved.apiKey) : undefined;
        const text =
          provider === "google"
            ? await completeGemini(resolved.apiKey, model, messages, fetchImpl)
            : await completeOpenAICompatible({
                apiKey: resolved.apiKey,
                baseUrl: resolved.baseUrl || providerMeta(provider).baseUrl,
                model,
                messages,
                extraHeaders: extraHeaders
                  ? {
                      "HTTP-Referer": extraHeaders["HTTP-Referer"],
                      "X-Title": extraHeaders["X-Title"],
                    }
                  : undefined,
                fetchImpl,
              });
        if (!text.trim()) {
          lastError = `${providerMeta(provider).label} returned an empty reply.`;
          break;
        }
        return { text: text.trim(), model, provider };
      } catch (err) {
        lastError = (err as Error).message;
        if (isRateLimitError(lastError) && attempt < 2) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        if (isRetryableModelError(lastError)) break;
        throw new Error(`${providerMeta(provider).label} failed: ${lastError}`);
      }
    }
  }
  throw new Error(`${providerMeta(provider).label} failed: ${lastError}`);
}

export async function completeOpenAICompatible(opts: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: { role: string; content: string }[];
  extraHeaders?: Record<string, string>;
  fetchImpl?: FetchLike;
}): Promise<string> {
  const fetchImpl = opts.fetchImpl || fetch;
  const url = `${(opts.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      ...(opts.extraHeaders || {}),
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    throw new Error(formatHttpError(res.status, await res.text()));
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "";
}

async function completeGemini(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  fetchImpl: FetchLike,
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  let contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  while (contents[0]?.role === "model") contents = contents.slice(1);
  if (!contents.length) {
    contents = [{ role: "user", parts: [{ text: "Hello" }] }];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) {
    throw new Error(formatHttpError(res.status, await res.text()));
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

/** @deprecated use completeChat */
export async function completeOpenAI(opts: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<string> {
  return completeOpenAICompatible(opts);
}

export function teammateSystemPrompt(bot?: { name: string; title: string; description: string; systemPrompt: string }): string {
  if (!bot) return "You are a Crew teammate. Answer helpfully in the user's language.";
  return [
    `You are ${bot.name}, ${bot.title}. ${bot.description}`,
    bot.systemPrompt,
    "Answer as this teammate. Be concrete and useful. You have a working model — never say you cannot access an API or that you are only a local demo.",
  ].join("\n");
}

export async function testProviderConnection(
  provider: FreeLlmProviderId,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: true; sample: string; model: string; rateLimited?: boolean }> {
  const verified = await verifyApiKey(provider, apiKey, fetchImpl);
  return {
    ok: true,
    sample: verified.rateLimited ? "connected (rate limited)" : "connected",
    model: verified.model,
    rateLimited: verified.rateLimited,
  };
}
