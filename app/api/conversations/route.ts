import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { MAX_GROUP } from "@/lib/types";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { kind: "dm" | "group"; botIds: string[]; title?: string };
  const botIds = [...new Set(body.botIds || [])];
  if (body.kind === "group" && (botIds.length < 2 || botIds.length > MAX_GROUP)) {
    return NextResponse.json({ error: "Groep: 2 tot 6 bots" }, { status: 400 });
  }
  const convo = await mutate((state) => {
    const title =
      body.title ||
      (body.kind === "dm"
        ? state.bots.find((b) => b.id === botIds[0])?.name || "Chat"
        : botIds
            .map((id) => state.bots.find((b) => b.id === id)?.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(", "));
    const created = {
      id: "convo_" + Math.random().toString(36).slice(2, 10),
      kind: body.kind,
      title,
      botIds,
      lastMessageAt: new Date().toISOString(),
      lastPreview: "Nieuw gesprek",
      attention: "none" as const,
    };
    state.conversations.unshift(created);
    return created;
  });
  return NextResponse.json({ conversation: convo });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { id: string; attention?: "none" | "unread" | "needs"; title?: string };
  await mutate((state) => {
    const c = state.conversations.find((x) => x.id === body.id);
    if (!c) return;
    if (body.attention) c.attention = body.attention;
    if (body.title) c.title = body.title;
  });
  return NextResponse.json({ ok: true });
}
