import type { CrewState } from "./types";
import { decryptSecret } from "./crypto";
import {
  envKeyForProvider,
  FREE_LLM_PROVIDER_IDS,
  isFreeLlmProvider,
  providerMeta,
  type FreeLlmProviderId,
} from "./providers";

export type ResolvedModel = {
  provider: FreeLlmProviderId | "crew-local";
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

function byok(state: CrewState, provider: FreeLlmProviderId): string | undefined {
  const row = state.keys.find((k) => k.provider === provider);
  if (row) {
    try {
      return decryptSecret(row.ciphertext);
    } catch {
      return undefined;
    }
  }
  return envKeyForProvider(provider);
}

export function resolveModel(state: CrewState, preferred = "auto"): ResolvedModel {
  const order: FreeLlmProviderId[] =
    preferred !== "auto" && isFreeLlmProvider(preferred)
      ? [preferred, ...FREE_LLM_PROVIDER_IDS.filter((p) => p !== preferred)]
      : [...FREE_LLM_PROVIDER_IDS];

  for (const p of order) {
    const key = byok(state, p);
    if (!key) continue;
    const meta = providerMeta(p);
    return { provider: p, model: meta.defaultModel, apiKey: key, baseUrl: meta.baseUrl };
  }

  return { provider: "crew-local", model: "crew-local" };
}

export async function completeChat(
  resolved: ResolvedModel,
  messages: { role: string; content: string }[],
): Promise<string> {
  if (resolved.provider === "crew-local" || !resolved.apiKey) {
    throw new Error("Geen LLM key verbonden");
  }
  if (resolved.provider === "google") {
    return completeGemini(resolved.apiKey, resolved.model, messages);
  }
  return completeOpenAICompatible({
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl || providerMeta(resolved.provider).baseUrl,
    model: resolved.model,
    messages,
    extraHeaders:
      resolved.provider === "openrouter"
        ? {
            "HTTP-Referer": process.env.CREW_PUBLIC_URL || "https://crew.app",
            "X-Title": "Crew",
          }
        : undefined,
  });
}

export async function completeOpenAICompatible(opts: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: { role: string; content: string }[];
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const url = `${(opts.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
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
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM ${res.status}: ${err.slice(0, 240)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "";
}

async function completeGemini(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return text;
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

export async function testProviderConnection(provider: FreeLlmProviderId, apiKey: string): Promise<{ ok: true; sample: string }> {
  const meta = providerMeta(provider);
  const sample = await completeChat(
    { provider, model: meta.defaultModel, apiKey, baseUrl: meta.baseUrl },
    [
      { role: "system", content: "Antwoord in één korte zin." },
      { role: "user", content: "Zeg alleen: verbonden." },
    ],
  );
  return { ok: true, sample: sample.slice(0, 120) };
}
