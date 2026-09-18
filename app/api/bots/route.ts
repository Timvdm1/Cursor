import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { MAX_BOTS, type AvatarShape } from "@/lib/types";
import { AVATAR_COLORS, AVATAR_SHAPES } from "@/lib/types";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    name?: string;
    title?: string;
    description?: string;
    color?: string;
    shape?: AvatarShape;
  };
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const bot = await mutate((state) => {
    if (state.bots.filter((b) => !b.hidden).length >= MAX_BOTS) {
      throw new Error("max_bots");
    }
    const id = "bot_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) + Math.random().toString(36).slice(2, 5);
    const created = {
      id,
      name,
      title: body.title || "Specialist",
      description: body.description || "New teammate",
      color: body.color || AVATAR_COLORS[state.bots.length % AVATAR_COLORS.length],
      shape: body.shape || AVATAR_SHAPES[state.bots.length % AVATAR_SHAPES.length],
      memory: "",
      systemPrompt: `Je bent ${name}. ${body.description || "Help de gebruiker in je rol."}`,
      model: "auto",
      createdAt: new Date().toISOString(),
      hidden: false,
      notifications: true,
    };
    state.bots.push(created);
    state.conversations.unshift({
      id: "convo_" + id,
      kind: "dm",
      title: name,
      botIds: [id],
      lastMessageAt: new Date().toISOString(),
      lastPreview: "What should I own?",
      attention: "unread",
    });
    state.messages.push({
      id: "msg_" + Math.random().toString(36).slice(2, 10),
      conversationId: "convo_" + id,
      role: "assistant",
      senderBotId: id,
      kind: "text",
      content: `Hey, I’m ${name}. What should I own? Dump the job — I’ll ask follow-ups.`,
      createdAt: new Date().toISOString(),
    });
    return created;
  }).catch((err: Error) => {
    if (err.message === "max_bots") return null;
    throw err;
  });

  if (!bot) return NextResponse.json({ error: "Max 50 bots" }, { status: 400 });
  return NextResponse.json({ bot });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    id: string;
    name?: string;
    title?: string;
    description?: string;
    hidden?: boolean;
    notifications?: boolean;
    color?: string;
    shape?: AvatarShape;
  };
  const bot = await mutate((state) => {
    const found = state.bots.find((b) => b.id === body.id);
    if (!found) return null;
    if (body.name) found.name = body.name;
    if (body.title) found.title = body.title;
    if (body.description) found.description = body.description;
    if (body.color) found.color = body.color;
    if (body.shape) found.shape = body.shape;
    if (typeof body.hidden === "boolean") found.hidden = body.hidden;
    if (typeof body.notifications === "boolean") found.notifications = body.notifications;
    const convo = state.conversations.find((c) => c.kind === "dm" && c.botIds[0] === found.id);
    if (convo && body.name) convo.title = body.name;
    return found;
  });
  if (!bot) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ bot });
}
