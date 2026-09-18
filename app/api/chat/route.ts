import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { eventsToMessages, runTurn } from "@/lib/orchestrator";
import { canHandoff, nextHopCount } from "@/lib/handoffs";
import {
  applyLlmToEvents,
  applyProviderError,
  chatHistory,
  completeChat,
  resolveModel,
  teammateSystemPrompt,
  type ChatCompletion,
} from "@/lib/models";
import { navigate } from "@/lib/computer";
import { providerMeta } from "@/lib/providers";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    conversationId: string;
    content: string;
    replyToId?: string;
  };
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const prepared = await mutate((state) => {
    const convo = state.conversations.find((c) => c.id === body.conversationId);
    if (!convo) throw new Error("missing_convo");

    const userMsg: Message = {
      id: "msg_" + Math.random().toString(36).slice(2, 10),
      conversationId: convo.id,
      role: "user",
      kind: "text",
      content,
      createdAt: new Date().toISOString(),
      replyToId: body.replyToId,
    };
    state.messages.push(userMsg);
    convo.lastMessageAt = userMsg.createdAt;
    convo.lastPreview = content.slice(0, 80);
    convo.attention = "none";

    const primaryBot = state.bots.find((b) => convo.botIds.includes(b.id));
    const sender = primaryBot?.id || convo.botIds[0];
    convo.workingBotId = sender;

    return {
      conversationId: convo.id,
      sender,
      bot: primaryBot,
      resolved: resolveModel(state, primaryBot?.model),
      history: chatHistory(state.messages, convo.id),
      userMsg,
    };
  }).catch((err: Error) => {
    if (err.message === "missing_convo") return null;
    throw err;
  });

  if (!prepared) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  let completion: ChatCompletion | null = null;
  let llmError: string | null = prepared.resolved.error || null;
  if (prepared.resolved.apiKey && prepared.resolved.provider !== "crew-local") {
    try {
      completion = await completeChat(prepared.resolved, [
        { role: "system", content: teammateSystemPrompt(prepared.bot) },
        ...prepared.history,
      ]);
      llmError = null;
    } catch (err) {
      llmError = (err as Error).message;
    }
  }

  const result = await mutate(async (state) => {
    const convo = state.conversations.find((c) => c.id === prepared.conversationId);
    if (!convo) throw new Error("missing_convo");
    const sender = prepared.sender;

    let events = await runTurn({
      state,
      conversationId: convo.id,
      userText: content,
      hopCount: 0,
    });
    if (completion) events = applyLlmToEvents(events, completion);
    else if (llmError) events = applyProviderError(events, llmError);

    const produced = eventsToMessages(events, convo.id, sender);
    state.messages.push(...produced);

    for (const ev of events) {
      if (ev.type === "file") {
        const existing = state.files.find((f) => f.path === ev.path);
        if (existing) {
          existing.content = ev.content;
          existing.updatedAt = new Date().toISOString();
        } else {
          state.files.push({ path: ev.path, content: ev.content, updatedAt: new Date().toISOString() });
        }
      }
      if (ev.type === "computer") {
        state.computer.active = true;
        state.computer.url = ev.url;
        state.computer.status = ev.status;
        state.computer.title = ev.url.replace(/^https?:\/\//, "").slice(0, 40);
        convo.workingBotId = sender;
      }
      if (ev.type === "blocked") {
        state.computer.takeover = true;
        state.computer.active = true;
        convo.attention = "needs";
      }
      if (ev.type === "approval") {
        const msg = produced.find((m) => m.kind === "approval");
        state.approvals.push({
          id: "appr_" + Math.random().toString(36).slice(2, 8),
          conversationId: convo.id,
          messageId: msg?.id || "",
          action: ev.action,
          payload: ev.payload,
          status: "pending",
        });
        convo.attention = "needs";
      }
      if (ev.type === "handoff") {
        const hops = 1;
        if (canHandoff(hops)) {
          state.handoffs.push({
            id: "hd_" + Math.random().toString(36).slice(2, 8),
            conversationId: convo.id,
            fromBotId: sender,
            toBotId: ev.toBotId,
            body: ev.body,
            status: "queued",
            hopCount: hops,
            createdAt: new Date().toISOString(),
          });
        }
      }
      if (ev.type === "card" && ev.card.type === "routine") {
        const rtn = {
          id: "rtn_" + Math.random().toString(36).slice(2, 8),
          botId: sender,
          name: String(ev.card.name),
          instructions: content,
          schedule: "0 8 * * 1-5",
          timezone: state.user?.timezone || "Europe/Amsterdam",
          paused: false,
          approvalBoundary: "No external sends.",
          nextRunAt: new Date(Date.now() + 3600_000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        const count = state.routines.filter((r) => r.botId === sender).length;
        if (count < 50) state.routines.push(rtn);
      }
    }

    const last = produced.at(-1);
    if (last) {
      convo.lastPreview = last.content.slice(0, 80);
      convo.lastMessageAt = last.createdAt;
    }

    const usedComputer = events.some((e) => e.type === "computer");
    if (convo.attention === "needs" || !usedComputer) {
      convo.workingBotId = undefined;
    }

    const queued = state.handoffs.filter((h) => h.status === "queued" && h.conversationId === convo.id);
    for (const hd of queued) {
      if (!canHandoff(hd.hopCount)) {
        hd.status = "blocked";
        continue;
      }
      hd.status = "running";
      const follow = await runTurn({
        state,
        conversationId: hd.conversationId,
        userText: `[handoff from ${hd.fromBotId}] ${hd.body}`,
        hopCount: nextHopCount(hd.hopCount),
      });
      const extra = eventsToMessages(follow, hd.conversationId, hd.toBotId);
      state.messages.push(...extra);
      produced.push(...extra);
      hd.status = "done";
    }

    return {
      userMsg: prepared.userMsg,
      produced,
      events,
      computer: state.computer,
      llm: completion
        ? {
            provider: completion.provider,
            model: completion.model,
            label: providerMeta(completion.provider).label,
          }
        : null,
      llmError,
    };
  }).catch((err: Error) => {
    if (err.message === "missing_convo") return null;
    throw err;
  });

  if (!result) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const nav = result.events.find((e) => e.type === "computer");
  if (nav && nav.type === "computer") {
    await navigate(nav.url).catch(() => undefined);
  }

  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { handoffId: string };
  const out = await mutate(async (state) => {
    const hd = state.handoffs.find((h) => h.id === body.handoffId);
    if (!hd || hd.status !== "queued") return null;
    if (!canHandoff(hd.hopCount)) {
      hd.status = "blocked";
      return { blocked: true };
    }
    hd.status = "running";
    const events = await runTurn({
      state,
      conversationId: hd.conversationId,
      userText: `[handoff from ${hd.fromBotId}] ${hd.body}`,
      hopCount: nextHopCount(hd.hopCount),
    });
    const msgs = eventsToMessages(events, hd.conversationId, hd.toBotId);
    state.messages.push(...msgs);
    hd.status = "done";
    return { messages: msgs };
  });
  return NextResponse.json(out || { ok: false });
}
