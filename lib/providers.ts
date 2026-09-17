/** Free-tier LLM providers users can connect with their own API keys. */
export const FREE_LLM_PROVIDER_IDS = ["cerebras", "mistral", "google", "groq", "openrouter"] as const;

export type FreeLlmProviderId = (typeof FREE_LLM_PROVIDER_IDS)[number];

export type LlmProviderMeta = {
  id: FreeLlmProviderId;
  label: string;
  signupUrl: string;
  keyHint: string;
  placeholder: string;
  defaultModel: string;
  baseUrl?: string;
  notes: string;
};

export const FREE_LLM_PROVIDERS: LlmProviderMeta[] = [
  {
    id: "cerebras",
    label: "Cerebras",
    signupUrl: "https://cloud.cerebras.ai/",
    keyHint: "Free tier in the Cerebras Cloud dashboard",
    placeholder: "csk-…",
    defaultModel: "llama-3.3-70b",
    baseUrl: "https://api.cerebras.ai/v1",
    notes: "Fast inference; OpenAI-compatible endpoint.",
  },
  {
    id: "mistral",
    label: "Mistral",
    signupUrl: "https://console.mistral.ai/",
    keyHint: "Experiment / free credits in Mistral La Plateforme",
    placeholder: "…",
    defaultModel: "mistral-small-latest",
    baseUrl: "https://api.mistral.ai/v1",
    notes: "Mistral chat models via the OpenAI-compatible API.",
  },
  {
    id: "google",
    label: "Google Gemini",
    signupUrl: "https://aistudio.google.com/apikey",
    keyHint: "Free API key in Google AI Studio",
    placeholder: "AIza…",
    defaultModel: "gemini-2.0-flash",
    notes: "Gemini generateContent API.",
  },
  {
    id: "groq",
    label: "Groq",
    signupUrl: "https://console.groq.com/keys",
    keyHint: "Free tier in GroqCloud",
    placeholder: "gsk_…",
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    notes: "Low latency; OpenAI-compatible.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    signupUrl: "https://openrouter.ai/settings/keys",
    keyHint: "Free models via the :free suffix (quota may apply)",
    placeholder: "sk-or-…",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    baseUrl: "https://openrouter.ai/api/v1",
    notes: "One key, many free models.",
  },
];

export function isFreeLlmProvider(id: string): id is FreeLlmProviderId {
  return (FREE_LLM_PROVIDER_IDS as readonly string[]).includes(id);
}

export function providerMeta(id: FreeLlmProviderId): LlmProviderMeta {
  const found = FREE_LLM_PROVIDERS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown provider ${id}`);
  return found;
}

export function envKeyForProvider(id: FreeLlmProviderId): string | undefined {
  const map: Record<FreeLlmProviderId, string | undefined> = {
    cerebras: process.env.CEREBRAS_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };
  return map[id];
}
