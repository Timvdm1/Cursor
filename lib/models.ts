import type { ProviderId } from "./types";
import { decryptSecret } from "./crypto";
import type { CrewState } from "./types";

export type ResolvedModel = {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

const DEFAULTS: Record<string, { provider: ProviderId; model: string; baseUrl?: string }> = {
  openai: { provider: "openai", model: "gpt-4o-mini" },
  anthropic: { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
  google: { provider: "google", model: "gemini-2.5-flash" },
  xai: { provider: "xai", model: "grok-4", baseUrl: "https://api.x.ai/v1" },
  openrouter: {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
  },
};

export function resolveModel(state: CrewState, preferred = "auto"): ResolvedModel {
  const byok = (provider: ProviderId) => state.keys.find((k) => k.provider === provider);

  const tryKey = (provider: ProviderId): string | undefined => {
    const row = byok(provider);
    if (row) {
      try {
        return decryptSecret(row.ciphertext);
      } catch {
        return undefined;
      }
    }
    const envMap: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      xai: process.env.XAI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
    };
    return envMap[provider];
  };

  const order: ProviderId[] =
    preferred !== "auto" && preferred in DEFAULTS
      ? [preferred as ProviderId]
      : ["openai", "anthropic", "xai", "openrouter", "google"];

  for (const p of order) {
    const key = tryKey(p);
    if (!key) continue;
    return { ...DEFAULTS[p], apiKey: key };
  }

  if (process.env.NETLIFY_AI_GATEWAY || process.env.OPENAI_BASE_URL) {
    return { provider: "gateway", model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY || "netlify" };
  }

  return { provider: "gateway", model: "crew-local" };
}

export async function completeOpenAI(opts: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<string> {
  const url = `${(opts.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content || "";
}
