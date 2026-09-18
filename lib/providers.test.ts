import { describe, expect, it } from "vitest";
import { FREE_LLM_PROVIDER_IDS, isFreeLlmProvider, providerMeta } from "./providers";
import { resolveModel } from "./models";
import { encryptSecret } from "./crypto";
import { emptyState } from "./seed";

describe("isFreeLlmProvider", () => {
  it("allows only the five free providers", () => {
    for (const id of FREE_LLM_PROVIDER_IDS) {
      expect(isFreeLlmProvider(id)).toBe(true);
    }
    expect(isFreeLlmProvider("openai")).toBe(false);
    expect(isFreeLlmProvider("anthropic")).toBe(false);
  });
});

describe("providerMeta", () => {
  it("has defaults for each provider", () => {
    for (const id of FREE_LLM_PROVIDER_IDS) {
      const meta = providerMeta(id);
      expect(meta.defaultModel.length).toBeGreaterThan(2);
      expect(meta.fallbackModels.length).toBeGreaterThan(0);
      expect(meta.signupUrl.startsWith("https://")).toBe(true);
    }
  });
});

describe("resolveModel", () => {
  it("prefers a connected key", () => {
    const state = emptyState();
    state.keys.push({
      provider: "groq",
      ciphertext: encryptSecret("gsk_test1234567890"),
      last4: "7890",
    });
    const resolved = resolveModel(state);
    expect(resolved.provider).toBe("groq");
    expect(resolved.apiKey).toBeTruthy();
  });

  it("falls back to crew-local without keys", () => {
    const resolved = resolveModel(emptyState());
    expect(resolved.provider).toBe("crew-local");
  });
});
