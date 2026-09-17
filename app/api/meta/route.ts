import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { currentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { messageId: string; emoji: string };
  await mutate((state) => {
    const msg = state.messages.find((m) => m.id === body.messageId);
    if (!msg) return;
    msg.reactions = msg.reactions || {};
    msg.reactions[body.emoji] = (msg.reactions[body.emoji] || 0) + 1;
  });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { botId: string; note: string };
  await mutate((state) => {
    const row = state.memories.find((m) => m.botId === body.botId);
    if (row) {
      row.note = body.note;
      row.updatedAt = new Date().toISOString();
    } else {
      state.memories.push({ botId: body.botId, note: body.note, updatedAt: new Date().toISOString() });
    }
  });
  return NextResponse.json({ ok: true });
}
