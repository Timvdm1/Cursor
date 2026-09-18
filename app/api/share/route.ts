import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { loadState } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("botId");
  const state = await loadState();
  const bot = state.bots.find((b) => b.id === botId);
  if (!bot) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    bot: {
      name: bot.name,
      title: bot.title,
      description: bot.description,
      systemPrompt: bot.systemPrompt,
      shape: bot.shape,
      color: bot.color,
    },
    skills: state.skills.filter((s) => s.enabledBotIds.includes(bot.id)).map((s) => ({ name: s.name, slug: s.slug })),
    note: "Gedeelde computer, logins en geschiedenis gaan niet mee.",
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { botId: string };
  const state = await loadState();
  const bot = state.bots.find((b) => b.id === body.botId);
  if (!bot) return NextResponse.json({ error: "not found" }, { status: 404 });
  const origin = new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/share/${bot.id}` });
}
