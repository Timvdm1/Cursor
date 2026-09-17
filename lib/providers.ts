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
    keyHint: "Gratis tier in het Cerebras Cloud dashboard",
    placeholder: "csk-…",
    defaultModel: "llama-3.3-70b",
    baseUrl: "https://api.cerebras.ai/v1",
    notes: "Snelle inference; OpenAI-compatibel endpoint.",
  },
  {
    id: "mistral",
    label: "Mistral",
    signupUrl: "https://console.mistral.ai/",
    keyHint: "Experiment / free credits in Mistral La Plateforme",
    placeholder: "…",
    defaultModel: "mistral-small-latest",
    baseUrl: "https://api.mistral.ai/v1",
    notes: "Mistral chat models via OpenAI-compatibel API.",
  },
  {
    id: "google",
    label: "Google Gemini",
    signupUrl: "https://aistudio.google.com/apikey",
    keyHint: "Gratis API key in Google AI Studio",
    placeholder: "AIza…",
    defaultModel: "gemini-2.0-flash",
    notes: "Gemini generateContent API.",
  },
  {
    id: "groq",
    label: "Groq",
    signupUrl: "https://console.groq.com/keys",
    keyHint: "Gratis tier in GroqCloud",
    placeholder: "gsk_…",
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
    notes: "Lage latency; OpenAI-compatibel.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    signupUrl: "https://openrouter.ai/settings/keys",
    keyHint: "Gratis modellen via :free suffix (quota kan gelden)",
    placeholder: "sk-or-…",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    baseUrl: "https://openrouter.ai/api/v1",
    notes: "Eén key, veel gratis modellen.",
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
