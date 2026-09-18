import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { encryptSecret, last4, maskKey } from "@/lib/crypto";
import { isFreeLlmProvider, providerMeta, type FreeLlmProviderId } from "@/lib/providers";
import { testProviderConnection } from "@/lib/models";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keys = await mutate((s) =>
    s.keys
      .filter((k) => isFreeLlmProvider(k.provider))
      .map((k) => ({ provider: k.provider, last4: maskKey(k.last4) })),
  );
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { provider?: string; secret?: string; test?: boolean };
  const provider = body.provider || "";
  const secret = (body.secret || "").trim();
  if (!isFreeLlmProvider(provider)) {
    return NextResponse.json(
      { error: "Only Cerebras, Mistral, Google Gemini, Groq, and OpenRouter are allowed." },
      { status: 400 },
    );
  }
  if (!secret) return NextResponse.json({ error: "API key is required" }, { status: 400 });

  if (body.test !== false) {
    try {
      const test = await testProviderConnection(provider, secret);
      await mutate((state) => {
        state.keys = state.keys.filter((k) => k.provider !== provider);
        state.keys.push({
          provider: provider as FreeLlmProviderId,
          ciphertext: encryptSecret(secret),
          last4: last4(secret),
        });
      });
      return NextResponse.json({
        ok: true,
        provider,
        last4: maskKey(last4(secret)),
        model: test.model,
        label: providerMeta(provider).label,
        rateLimited: Boolean(test.rateLimited),
      });
    } catch (err) {
      return NextResponse.json(
        { error: `Connection failed: ${(err as Error).message}` },
        { status: 400 },
      );
    }
  }

  await mutate((state) => {
    state.keys = state.keys.filter((k) => k.provider !== provider);
    state.keys.push({
      provider: provider as FreeLlmProviderId,
      ciphertext: encryptSecret(secret),
      last4: last4(secret),
    });
  });
  return NextResponse.json({
    ok: true,
    provider,
    last4: maskKey(last4(secret)),
    label: providerMeta(provider).label,
  });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") || "";
  if (!isFreeLlmProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  await mutate((state) => {
    state.keys = state.keys.filter((k) => k.provider !== provider);
  });
  return NextResponse.json({ ok: true });
}
