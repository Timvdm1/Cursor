import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { loadState } from "@/lib/store";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
  const state = await loadState();
  if (!q) return NextResponse.json({ bots: [], messages: [], files: [], skills: [] });
  return NextResponse.json({
    bots: state.bots.filter((b) => `${b.name} ${b.title} ${b.description}`.toLowerCase().includes(q)).slice(0, 8),
    messages: state.messages.filter((m) => m.content.toLowerCase().includes(q)).slice(0, 8),
    files: state.files.filter((f) => `${f.path} ${f.content}`.toLowerCase().includes(q)).slice(0, 8),
    skills: state.skills.filter((s) => `${s.name} ${s.slug}`.toLowerCase().includes(q)).slice(0, 8),
  });
}
