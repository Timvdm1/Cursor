import { hashPassword } from "./crypto";
import { BOT_TEMPLATES, PLUGIN_CATALOG } from "./catalog";
import type { CrewState } from "./types";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function iso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export function emptyState(): CrewState {
  return {
    user: null,
    bots: [],
    conversations: [],
    messages: [],
    handoffs: [],
    skills: [],
    routines: [],
    routineRuns: [],
    approvals: [],
    autoReviewRules: [],
    plugins: PLUGIN_CATALOG,
    installs: [],
    keys: [],
    files: [],
    computer: {
      active: false,
      url: "crew://desktop",
      title: "Agent Computer",
      status: "Idle",
      cursor: { x: 48, y: 64 },
      logs: [],
      takeover: false,
      wallpaperHour: new Date().getHours(),
      localExecution: "ask",
      localEgress: false,
    },
    memories: [],
  };
}

export function seedState(): CrewState {
  const state = emptyState();
  state.user = {
    id: "user_demo",
    email: "demo@crew.app",
    name: "Tim",
    passwordHash: hashPassword("crew"),
    appearance: "dark",
    timezone: "Europe/Amsterdam",
  };

  const bots = BOT_TEMPLATES.map((t, i) => ({
    id: `bot_${t.id}`,
    name: t.name,
    title: t.title,
    description: t.description,
    color: t.color,
    shape: t.shape,
    memory: "",
    systemPrompt: t.systemPrompt,
    model: "auto",
    createdAt: iso(-i * 3600_000),
    hidden: false,
    notifications: true,
  }));
  state.bots = bots;

  const chief = bots[0];
  const inbox = bots[1];
  const research = bots[2];

  const dmChief = {
    id: "convo_chief",
    kind: "dm" as const,
    title: chief.name,
    botIds: [chief.id],
    lastMessageAt: iso(-120_000),
    lastPreview: "Zeg maar wat er vandaag af moet.",
    attention: "unread" as const,
  };
  const group = {
    id: "convo_group",
    kind: "group" as const,
    title: "Lancering",
    botIds: [chief.id, inbox.id, research.id],
    lastMessageAt: iso(-40_000),
    lastPreview: "Research: bronnen staan in /workspace/brief.md",
    attention: "none" as const,
  };
  state.conversations = [dmChief, group];

  state.messages = [
    {
      id: id("msg"),
      conversationId: dmChief.id,
      role: "assistant",
      senderBotId: chief.id,
      kind: "text",
      content:
        "Hey, ik ben je Chief of Staff. Ik houd de anderen gericht en haal jou er alleen bij als er een oordeel nodig is. Wat moet er vandaag gebeuren?",
      createdAt: iso(-300_000),
    },
    {
      id: id("msg"),
      conversationId: group.id,
      role: "user",
      kind: "text",
      content: "Zet een korte brief klaar voor de lancering. @Research zoekt bronnen, @Inbox maakt een concept-mail.",
      createdAt: iso(-180_000),
    },
    {
      id: id("msg"),
      conversationId: group.id,
      role: "assistant",
      senderBotId: chief.id,
      kind: "handoff",
      content: "Doorgezet naar Research en Inbox.",
      createdAt: iso(-90_000),
      card: { from: chief.id, to: [research.id, inbox.id] },
    },
    {
      id: id("msg"),
      conversationId: group.id,
      role: "assistant",
      senderBotId: research.id,
      kind: "text",
      content: "Bronnen staan in /workspace/brief.md. Drie claims, elk met een URL.",
      createdAt: iso(-40_000),
    },
  ];

  state.skills = [
    {
      id: "skill_briefing",
      name: "Morning briefing",
      slug: "morning-briefing",
      whenToUse: "Dagstart, status van alle bots.",
      instructions:
        "Vraag elke bot om een regel status. Geen externe mails. Post een bulletsamenvatting. Missende data: zeg dat, verzin niets.",
      requiresApproval: false,
      enabledBotIds: bots.map((b) => b.id),
    },
    {
      id: "skill_draft_email",
      name: "Draft email",
      slug: "draft-email",
      whenToUse: "Mail schrijven in de stem van de gebruiker.",
      instructions: "Schrijf een concept. Versturen altijd achter approval.",
      requiresApproval: true,
      enabledBotIds: [inbox.id],
    },
  ];

  state.autoReviewRules = [
    { id: "rule_send", pattern: "send|email|publish", mode: "ask_first" },
    { id: "rule_read", pattern: "web_search|fetch_url|files_read", mode: "allow" },
  ];

  state.installs = PLUGIN_CATALOG.filter((p) =>
    ["web_search", "fetch_url", "files", "browser", "memory", "message_bot", "create_routine", "terminal_sandbox"].includes(
      p.id,
    ),
  ).map((p) => ({ pluginId: p.id, enabledTools: p.tools, connected: true }));

  state.files = [
    {
      path: "/workspace/brief.md",
      content: "# Lancering\n\n- Claim 1: Crew is roster-first, niet sessie-first.\n- Claim 2: Bots delen één computer per account.\n",
      updatedAt: iso(-40_000),
    },
  ];

  state.routines = [
    {
      id: "rtn_morning",
      botId: chief.id,
      name: "Ochtendbriefing",
      instructions: "Run /morning-briefing. Post in DM met Chief of Staff.",
      schedule: "0 8 * * 1-5",
      timezone: "Europe/Amsterdam",
      paused: false,
      approvalBoundary: "Geen externe berichten.",
      nextRunAt: iso(3600_000),
      createdAt: iso(-86400_000),
    },
  ];

  return state;
}
