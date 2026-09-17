import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { id: string; decision: "allowed" | "denied" | "always" };
  const appr = await mutate((state) => {
    const row = state.approvals.find((a) => a.id === body.id || a.messageId === body.id);
    if (!row) return null;
    row.status = body.decision;
    const convo = state.conversations.find((c) => c.id === row.conversationId);
    if (convo) convo.attention = "none";
    state.messages.push({
      id: "msg_" + Math.random().toString(36).slice(2, 8),
      conversationId: row.conversationId,
      role: "system",
      kind: "event",
      content:
        body.decision === "denied"
          ? `Geweigerd: ${row.action}`
          : body.decision === "always"
            ? `Always allow voor ${row.action}`
            : `Allow once: ${row.action}`,
      createdAt: new Date().toISOString(),
    });
    if (body.decision === "always") {
      state.autoReviewRules.push({
        id: "rule_" + Math.random().toString(36).slice(2, 6),
        pattern: row.action,
        mode: "allow",
      });
    }
    return row;
  });
  if (!appr) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ approval: appr });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { pattern: string; mode: "ask_first" | "allow" };
  const rule = await mutate((state) => {
    const created = { id: "rule_" + Math.random().toString(36).slice(2, 6), pattern: body.pattern, mode: body.mode };
    state.autoReviewRules.push(created);
    return created;
  });
  return NextResponse.json({ rule });
}
