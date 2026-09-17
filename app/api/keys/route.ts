import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { encryptSecret, last4, maskKey } from "@/lib/crypto";
import type { ProviderId } from "@/lib/types";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keys = await mutate((s) => s.keys.map((k) => ({ provider: k.provider, last4: maskKey(k.last4) })));
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { provider?: ProviderId; secret?: string };
  if (!body.provider || !body.secret) {
    return NextResponse.json({ error: "provider en key verplicht" }, { status: 400 });
  }
  await mutate((state) => {
    state.keys = state.keys.filter((k) => k.provider !== body.provider);
    state.keys.push({
      provider: body.provider!,
      ciphertext: encryptSecret(body.secret!),
      last4: last4(body.secret!),
    });
  });
  return NextResponse.json({ ok: true, last4: maskKey(last4(body.secret)) });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") as ProviderId | null;
  await mutate((state) => {
    state.keys = state.keys.filter((k) => k.provider !== provider);
  });
  return NextResponse.json({ ok: true });
}
