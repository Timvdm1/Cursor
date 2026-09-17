import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { loadState } from "@/lib/store";
import { maskKey } from "@/lib/crypto";
import { isFreeLlmProvider } from "@/lib/providers";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const state = await loadState();
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, appearance: user.appearance, timezone: user.timezone },
    bots: state.bots.filter((b) => !b.hidden),
    conversations: state.conversations,
    messages: state.messages,
    skills: state.skills,
    routines: state.routines,
    routineRuns: state.routineRuns,
    approvals: state.approvals,
    autoReviewRules: state.autoReviewRules,
    plugins: state.plugins,
    installs: state.installs,
    files: state.files,
    computer: state.computer,
    memories: state.memories,
    keys: state.keys
      .filter((k) => isFreeLlmProvider(k.provider))
      .map((k) => ({ provider: k.provider, last4: maskKey(k.last4) })),
    handoffs: state.handoffs,
  });
}
