import type { Bot, CrewState, Message } from "./types";
import { canHandoff, debounceKey, shouldDebounce } from "./handoffs";
import { decideReview } from "./approvals";

export type TraceStep = { type: "trace"; text: string };
export type AgentEvent =
  | TraceStep
  | { type: "text"; text: string }
  | { type: "card"; card: Record<string, unknown>; content: string }
  | { type: "approval"; action: string; payload: Record<string, unknown>; content: string }
  | { type: "handoff"; toBotId: string; body: string; content: string }
  | { type: "file"; path: string; content: string }
  | { type: "computer"; url: string; status: string }
  | { type: "blocked"; reason: string };

const SENSITIVE = /password|passkey|2fa|captcha|betaal|payment|otp|one-time/i;

export function pickResponders(text: string, bots: Bot[], inConversation: string[]): Bot[] {
  const mentioned = [...text.matchAll(/@([A-Za-z][\w-]*)/g)].map((m) => m[1].toLowerCase());
  if (mentioned.includes("everyone")) {
    return bots.filter((b) => inConversation.includes(b.id));
  }
  const hits = bots.filter(
    (b) =>
      inConversation.includes(b.id) &&
      mentioned.some((n) => b.name.toLowerCase().replace(/\s+/g, "").includes(n.replace(/\s+/g, ""))),
  );
  if (hits.length) return hits;
  const first = bots.find((b) => inConversation.includes(b.id));
  return first ? [first] : [];
}

export function applySkill(text: string, state: CrewState): { text: string; skillName?: string } {
  const m = text.match(/(^|\s)\/([a-z0-9-]+)/i);
  if (!m) return { text };
  const slug = m[2].toLowerCase();
  const skill = state.skills.find((s) => s.slug === slug);
  if (!skill) return { text };
  return {
    text: `${text}\n\n[Skill ${skill.name}]\n${skill.instructions}`,
    skillName: skill.name,
  };
}

export async function runTurn(opts: {
  state: CrewState;
  conversationId: string;
  userText: string;
  hopCount?: number;
}): Promise<AgentEvent[]> {
  const convo = opts.state.conversations.find((c) => c.id === opts.conversationId);
  if (!convo) return [{ type: "text", text: "Dit gesprek bestaat niet." }];

  const { text, skillName } = applySkill(opts.userText, opts.state);
  const responders = pickResponders(text, opts.state.bots, convo.botIds);
  const events: AgentEvent[] = [];

  if (skillName) events.push({ type: "trace", text: `Skill ${skillName}` });

  for (const bot of responders) {
    events.push(...planForBot(bot, text, opts.state, convo.botIds, opts.hopCount ?? 0));
  }
  return events;
}

function planForBot(
  bot: Bot,
  text: string,
  state: CrewState,
  participants: string[],
  hopCount: number,
): AgentEvent[] {
  const events: AgentEvent[] = [];
  const lower = text.toLowerCase();

  if (SENSITIVE.test(text)) {
    events.push({ type: "trace", text: `${bot.name}: takeover gevraagd` });
    events.push({
      type: "blocked",
      reason: "Sensitive step — complete this on the computer, not in chat.",
    });
    events.push({
      type: "text",
      text: `${bot.name}: ik stop hier. Open de computer, doe de login/2FA zelf, en zeg daarna “ga door”.`,
    });
    return events;
  }

  if (/zoek|search|research|bron/i.test(lower) || bot.id.includes("research")) {
    events.push({ type: "trace", text: `${bot.name}: web_search` });
    events.push({
      type: "computer",
      url: "https://duckduckgo.com/?q=" + encodeURIComponent(text.slice(0, 80)),
      status: "Zoeken…",
    });
    events.push({
      type: "file",
      path: "/workspace/notes.md",
      content: `# Notes\n\nQuery: ${text}\n\n- Crew is roster-first (bots, geen wegwerp-chats).\n- Computer is account-scoped, niet per bot geïsoleerd.\n`,
    });
  }

  if (/mail|inbox|email/i.test(lower) || bot.id.includes("inbox")) {
    const action = "send_email";
    const decision = decideReview(action, state.autoReviewRules);
    events.push({
      type: "card",
      content: "Concept-mail klaar",
      card: {
        type: "email",
        from: "crew@local",
        to: "sarah@acme.com",
        subject: "Update",
        body: "Hoi Sarah,\n\nHier de korte status. Laat weten of we vrijdag 14:00 doen.\n\nGroet",
      },
    });
    if (decision === "ask_first") {
      events.push({
        type: "approval",
        action,
        payload: { to: "sarah@acme.com", subject: "Update" },
        content: "Mag ik deze mail versturen?",
      });
    }
  }

  if (/routine|elke ochtend|elke dag|schedule/i.test(lower)) {
    events.push({
      type: "card",
      content: `Routine aangemaakt: Ochtendcheck`,
      card: { type: "routine", name: "Ochtendcheck", schedule: "weekdays 08:00" },
    });
  }

  const mentionOthers = participants.filter((id) => id !== bot.id);
  if ((/chief|coord|handoff|stuur naar|@/i.test(lower) || bot.id.includes("chief")) && mentionOthers.length) {
    const target =
      state.bots.find((b) => mentionOthers.includes(b.id) && /research|inbox|builder/i.test(b.id)) ||
      state.bots.find((b) => mentionOthers.includes(b.id));
    if (target) {
      const key = debounceKey(bot.id, target.id, text);
      if (!canHandoff(hopCount)) {
        events.push({ type: "text", text: `${bot.name}: hop-limiet bereikt, ik stop de keten.` });
      } else if (shouldDebounce(key)) {
        events.push({ type: "trace", text: "Handoff gedempt (debounce)" });
      } else {
        events.push({
          type: "handoff",
          toBotId: target.id,
          body: text,
          content: `${bot.name} → ${target.name}`,
        });
      }
    }
  }

  const memory = state.memories.find((m) => m.botId === bot.id)?.note;
  const memoryLine = memory ? `\n\n(ik onthoud: ${memory})` : "";
  events.push({
    type: "text",
    text: reply(bot, text) + memoryLine,
  });
  return events;
}

function reply(bot: Bot, text: string): string {
  if (bot.id.includes("chief")) {
    return `Ik pak de coördinatie. Ik houd de specialisten in de keten en kom alleen terug als er een besluit nodig is.\n\nJij zei: “${trim(text)}”`;
  }
  if (bot.id.includes("research")) {
    return `Ik heb de vraag uitgezet en notities in /workspace/notes.md gezet. Wil je dat ik dieper graaf op een bron?`;
  }
  if (bot.id.includes("inbox")) {
    return `Concept staat klaar als kaart hierboven. Versturen doe ik pas na Allow once.`;
  }
  if (bot.id.includes("builder")) {
    return `Ik schrijf de wijziging in /workspace. Zeg maar welk bestand of welke bug eerst.`;
  }
  return `${bot.name}: begrepen. ${trim(text)}`;
}

function trim(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 180 ? `${t.slice(0, 177)}…` : t;
}

export function eventsToMessages(
  events: AgentEvent[],
  conversationId: string,
  senderBotId: string,
): Message[] {
  const now = Date.now();
  return events.map((event, i) => {
    const base = {
      id: `msg_${now}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      role: "assistant" as const,
      senderBotId,
      createdAt: new Date(now + i).toISOString(),
    };
    switch (event.type) {
      case "text":
        return { ...base, kind: "text" as const, content: event.text };
      case "trace":
        return { ...base, kind: "trace" as const, content: event.text };
      case "card":
        return { ...base, kind: "card" as const, content: event.content, card: event.card };
      case "approval":
        return {
          ...base,
          kind: "approval" as const,
          content: event.content,
          card: { action: event.action, payload: event.payload },
        };
      case "handoff":
        return {
          ...base,
          kind: "handoff" as const,
          content: event.content,
          card: { toBotId: event.toBotId, body: event.body },
        };
      case "blocked":
        return { ...base, kind: "event" as const, content: event.reason };
      default:
        return { ...base, kind: "event" as const, content: event.type };
    }
  });
}
