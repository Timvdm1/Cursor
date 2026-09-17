import { describe, expect, it, vi } from "vitest";
import { encryptSecret } from "./crypto";
import { applyLlmToEvents, applyProviderError, chatHistory, completeChat, resolveModel } from "./models";
import { emptyState } from "./seed";
import type { Message } from "./types";

describe("resolveModel", () => {
  it("uses the most recently connected key", () => {
    const state = emptyState();
    state.keys.push({
      provider: "cerebras",
      ciphertext: encryptSecret("csk_old"),
      last4: "_old",
    });
    state.keys.push({
      provider: "groq",
      ciphertext: encryptSecret("gsk_new1234567890"),
      last4: "7890",
    });
    const resolved = resolveModel(state);
    expect(resolved.provider).toBe("groq");
    expect(resolved.apiKey).toBe("gsk_new1234567890");
  });

  it("honors a bot's preferred provider when that key exists", () => {
    const state = emptyState();
    state.keys.push({
      provider: "groq",
      ciphertext: encryptSecret("gsk_new1234567890"),
      last4: "7890",
    });
    state.keys.push({
      provider: "google",
      ciphertext: encryptSecret("AIza_test"),
      last4: "test",
    });
    const resolved = resolveModel(state, "groq");
    expect(resolved.provider).toBe("groq");
  });

  it("surfaces a decrypt error instead of silently going local", () => {
    const state = emptyState();
    state.keys.push({ provider: "groq", ciphertext: "not-valid", last4: "xxxx" });
    const resolved = resolveModel(state);
    expect(resolved.provider).toBe("crew-local");
    expect(resolved.error).toMatch(/decrypt/i);
  });

  it("falls back to crew-local without keys", () => {
    expect(resolveModel(emptyState()).provider).toBe("crew-local");
  });
});

describe("completeChat", () => {
  it("retries a 404 model then returns the fallback reply", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { model?: string };
      if (body.model === "llama-3.3-70b-versatile") {
        return new Response(JSON.stringify({ error: { message: "model_not_found" } }), { status: 404 });
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "hello from groq" } }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const out = await completeChat(
      {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        apiKey: "gsk_test",
        baseUrl: "https://api.groq.com/openai/v1",
      },
      [{ role: "user", content: "hi" }],
      fetchImpl,
    );
    expect(out.text).toBe("hello from groq");
    expect(out.model).toBe("llama-3.1-8b-instant");
    expect(out.provider).toBe("groq");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not swallow a non-model provider error", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
    ) as unknown as typeof fetch;
    await expect(
      completeChat(
        { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "bad", baseUrl: "https://api.groq.com/openai/v1" },
        [{ role: "user", content: "hi" }],
        fetchImpl,
      ),
    ).rejects.toThrow(/Invalid API key/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("applyLlmToEvents", () => {
  it("replaces canned text with the model reply", () => {
    const events = applyLlmToEvents([{ type: "text", text: "Ik pak de coördinatie." }], {
      text: "I'll coordinate the launch brief.",
      model: "llama-3.1-8b-instant",
      provider: "groq",
    });
    const text = events.find((e) => e.type === "text");
    expect(text && text.type === "text" && text.text).toBe("I'll coordinate the launch brief.");
    expect(events[0]).toMatchObject({ type: "trace" });
  });

  it("adds a text event when the plan had none", () => {
    const events = applyLlmToEvents([], {
      text: "Here.",
      model: "gemini-2.5-flash",
      provider: "google",
    });
    expect(events.some((e) => e.type === "text" && e.text === "Here.")).toBe(true);
  });
});

describe("applyProviderError", () => {
  it("shows the failure in the transcript", () => {
    const events = applyProviderError([{ type: "text", text: "local" }], "401: Invalid API key");
    const text = events.find((e) => e.type === "text");
    expect(text && text.type === "text" && text.text).toContain("401: Invalid API key");
  });
});

describe("chatHistory", () => {
  it("keeps only user and assistant text", () => {
    const messages: Message[] = [
      {
        id: "1",
        conversationId: "c1",
        role: "user",
        kind: "text",
        content: "hello",
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        conversationId: "c1",
        role: "assistant",
        kind: "trace",
        content: "thinking",
        createdAt: new Date().toISOString(),
      },
      {
        id: "3",
        conversationId: "c1",
        role: "assistant",
        kind: "text",
        content: "hi",
        createdAt: new Date().toISOString(),
      },
    ];
    expect(chatHistory(messages, "c1")).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ]);
  });
});
