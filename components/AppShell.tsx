"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import type {
  Approval,
  AutoReviewRule,
  AvatarShape,
  Bot,
  BotStatus,
  ComputerState,
  Conversation,
  Message,
  Plugin,
  PluginInstall,
  Routine,
  Skill,
  WorkspaceFile,
} from "@/lib/types";
import { AVATAR_COLORS, AVATAR_SHAPES } from "@/lib/types";
import { BOT_TEMPLATES } from "@/lib/catalog";
import { presenceStatus, statusLabel } from "@/lib/status";
import { SettingsPanel, type SettingsTab } from "./SettingsPanel";

type Bootstrap = {
  user: { id: string; email: string; name: string; appearance: string; timezone?: string };
  bots: Bot[];
  conversations: Conversation[];
  messages: Message[];
  skills: Skill[];
  routines: Routine[];
  approvals: Approval[];
  autoReviewRules: AutoReviewRule[];
  plugins: Plugin[];
  installs: PluginInstall[];
  files: WorkspaceFile[];
  computer: ComputerState;
  keys: { provider: string; last4: string }[];
  activeLlm?: { provider: string; label: string; model: string } | null;
};

type Overlay = "none" | "market" | "settings" | "newbot" | "newgroup" | "palette" | "agent";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function AppShell({ initial }: { initial: Bootstrap }) {
  const [data, setData] = useState(initial);
  const [activeId, setActiveId] = useState(initial.conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [query, setQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [computerLevel, setComputerLevel] = useState<"status" | "preview" | "full">("preview");
  const [error, setError] = useState<string | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [theme, setTheme] = useState<"system" | "dark" | "light">(
    initial.user.appearance === "dark" || initial.user.appearance === "system" || initial.user.appearance === "light"
      ? initial.user.appearance
      : "light",
  );
  const [systemLight, setSystemLight] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [mobileScreen, setMobileScreen] = useState<"home" | "chat">("home");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [live, setLive] = useState<{ convoId: string; botId: string; status: BotStatus; action: string } | null>(null);
  const [pending, setPending] = useState<Message | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const liveTimer = useRef<number | null>(null);

  const convo = data.conversations.find((c) => c.id === activeId) || data.conversations[0];
  const messages = useMemo(
    () => data.messages.filter((m) => m.conversationId === convo?.id),
    [data.messages, convo?.id],
  );

  function presenceOf(c: Conversation | undefined, botId?: string): BotStatus {
    if (!c) return "idle";
    return presenceStatus({
      live: live && live.convoId === c.id && (!botId || live.botId === botId) ? live.status : undefined,
      workingBotId: c.workingBotId,
      botId,
      attention: c.attention,
    });
  }

  const presence = presenceOf(convo);
  const working = presence === "thinking" || presence === "working" || data.computer.active;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, pending]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setSystemLight(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => {
      if (mq.matches) setComputerLevel((level) => (level === "preview" ? "status" : level));
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "palette" ? "none" : "palette"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsTab("general");
        setOverlay((o) => (o === "settings" ? "none" : "settings"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOverlay("newbot");
      }
      if (e.key === "Escape") setOverlay("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function reload() {
    const next = await j<Bootstrap>("/api/bootstrap");
    setData(next);
    return next;
  }

  async function send(text = draft) {
    if (!convo || !text.trim() || busy) return;
    const botId = convo.botIds[0];
    const content = text.trim();
    setBusy(true);
    setError(null);
    setDraft("");
    setMentionOpen(false);
    setSlashOpen(false);
    setPending({
      id: "pending_" + Date.now(),
      conversationId: convo.id,
      role: "user",
      kind: "text",
      content,
      createdAt: new Date().toISOString(),
    });
    setLive({
      convoId: convo.id,
      botId,
      status: "thinking",
      action: data.activeLlm ? `Calling ${data.activeLlm.label}` : "Reading your message",
    });
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      setLive((cur) =>
        cur && cur.convoId === convo.id && cur.status === "thinking"
          ? { ...cur, status: "working", action: data.activeLlm ? `${data.activeLlm.label} is writing` : "Working" }
          : cur,
      );
    }, 420);
    try {
      const res = await j<{ llmError?: string | null; llm?: { label: string; model: string } | null }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId: convo.id, content }),
      });
      const next = await reload();
      setPending(null);
      if (res.llmError) setError(res.llmError);
      const nextConvo = next.conversations.find((c) => c.id === convo.id);
      if (nextConvo?.attention === "needs") {
        setLive({ convoId: convo.id, botId, status: "blocked", action: "Needs attention" });
      } else if (nextConvo?.workingBotId) {
        setLive({
          convoId: convo.id,
          botId,
          status: "working",
          action: next.computer.status || "Working",
        });
      } else {
        setLive({
          convoId: convo.id,
          botId,
          status: "done",
          action: res.llm ? `Replied with ${res.llm.label}` : "Done",
        });
        liveTimer.current = window.setTimeout(() => {
          setLive((cur) => (cur && cur.status === "done" ? null : cur));
        }, 700);
      }
    } catch (err) {
      setError((err as Error).message);
      setDraft(content);
      setPending(null);
      setLive({ convoId: convo.id, botId, status: "blocked", action: "Failed" });
    } finally {
      setBusy(false);
    }
  }

  function openConvo(id: string) {
    if (convo) setDrafts((d) => ({ ...d, [convo.id]: draft }));
    setActiveId(id);
    setDraft(drafts[id] || "");
    setRosterOpen(false);
    setPlusOpen(false);
    setMobileScreen("chat");
    setData((d) => ({
      ...d,
      conversations: d.conversations.map((c) => (c.id === id ? { ...c, attention: "none" } : c)),
    }));
    void j("/api/conversations", {
      method: "PATCH",
      body: JSON.stringify({ id, attention: "none" }),
    });
  }

  function backHome() {
    if (convo) setDrafts((d) => ({ ...d, [convo.id]: draft }));
    setMobileScreen("home");
    setComputerLevel("status");
    setMoreOpen(false);
    setPlusOpen(false);
    setAccountOpen(false);
  }

  function openSettings(tab: SettingsTab = "general") {
    setSettingsTab(tab);
    setOverlay("settings");
    setMoreOpen(false);
    setAccountOpen(false);
  }

  async function signOut() {
    await j("/api/session", { method: "DELETE" });
    window.location.reload();
  }

  function markConversation(attention: "none" | "unread") {
    if (!convo) return;
    void j("/api/conversations", { method: "PATCH", body: JSON.stringify({ id: convo.id, attention }) });
    setData((d) => ({
      ...d,
      conversations: d.conversations.map((c) => (c.id === convo.id ? { ...c, attention } : c)),
    }));
  }

  function onDraft(value: string) {
    setDraft(value);
    const at = /(?:^|\s)@(\w*)$/.exec(value);
    const sl = /(?:^|\s)\/([a-z0-9-]*)$/i.exec(value);
    setMentionOpen(Boolean(at));
    setSlashOpen(Boolean(sl));
  }

  const resolvedTheme = theme === "light" || (theme === "system" && systemLight) ? "light" : "dark";
  const hour = new Date().getHours();
  const wallpaper = `radial-gradient(1200px 600px at 20% 10%, hsl(${200 + hour * 4} 40% ${resolvedTheme === "dark" ? 18 : 72}%), transparent),
    linear-gradient(180deg, hsl(${210 + hour} 28% ${resolvedTheme === "dark" ? 10 : 86}%), hsl(${230} 30% ${resolvedTheme === "dark" ? 6 : 92}%))`;

  return (
    <div className={`crew-root ${resolvedTheme} phone-${mobileScreen} ${rosterOpen ? "roster-open" : ""} ${draft.trim() ? "has-draft" : ""}`}>
      {rosterOpen && <button className="scrim" aria-label="Close sidebar" onClick={() => setRosterOpen(false)} />}
      <aside className={`roster ${rosterOpen ? "open" : ""}`}>
        <header className="roster-head desk-bar">
          <label className="roster-search">
            <span className="search-ico" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoeken"
              aria-label="Zoeken"
            />
          </label>
        </header>
        <header className="ios-home-head">
          <h1>Crew</h1>
          <div className="ios-home-actions">
            <button className="icon-round" aria-label="Search" onClick={() => setOverlay("palette")}>
              ⌕
            </button>
            <button className="icon-round" aria-label="Settings" onClick={() => openSettings("general")}>
              ⚙
            </button>
            <button className="icon-round plus" aria-label="New" onClick={() => setMoreOpen((v) => !v)}>
              +
            </button>
          </div>
        </header>
        {moreOpen && mobileScreen === "home" && (
          <div className="plus-sheet">
            <button
              onClick={() => {
                setOverlay("newbot");
                setMoreOpen(false);
              }}
            >
              Create new agent
            </button>
            <button
              onClick={() => {
                setOverlay("newgroup");
                setMoreOpen(false);
              }}
            >
              New group
            </button>
            <button
              onClick={() => {
                setOverlay("market");
                setMoreOpen(false);
              }}
            >
              Marketplace
            </button>
          </div>
        )}
        <div className="roster-list">
          {data.conversations
            .filter((c) => c.botIds.some((id) => data.bots.some((b) => b.id === id)))
            .filter((c) => {
              const q = query.trim().toLowerCase();
              if (!q) return true;
              const bot = data.bots.find((b) => b.id === c.botIds[0]);
              return (
                c.title.toLowerCase().includes(q) ||
                c.lastPreview.toLowerCase().includes(q) ||
                (bot?.name || "").toLowerCase().includes(q)
              );
            })
            .map((c) => {
            const bot = data.bots.find((b) => b.id === c.botIds[0]);
            const status = presenceOf(c);
            return (
              <button
                key={c.id}
                className={`roster-row ${c.id === convo?.id ? "active" : ""} att-${c.attention}`}
                onClick={() => openConvo(c.id)}
              >
                {c.kind === "group" ? (
                  <span className="stack">
                    {c.botIds.slice(0, 3).map((id) => {
                      const b = data.bots.find((x) => x.id === id);
                      return b ? (
                        <Avatar key={id} color={b.color} shape={b.shape} size={18} status={presenceOf(c, id)} />
                      ) : null;
                    })}
                  </span>
                ) : bot ? (
                  <Avatar color={bot.color} shape={bot.shape} status={status} title={statusLabel(status)} />
                ) : null}
                <span className="meta">
                  <strong>
                    {c.title}
                    <time>{formatWhen(c.lastMessageAt)}</time>
                  </strong>
                  <em>{c.lastPreview}</em>
                </span>
                {c.attention !== "none" && <i className={`dot ${c.attention}`} />}
              </button>
            );
          })}
        </div>
        <footer className="roster-foot">
          <button className="market-link" onClick={() => setOverlay("market")}>
            <span className="market-ico" aria-hidden>
              ▦
            </span>
            Marketplace
          </button>
          <div className="account-menu">
            <button
              className="account-chip"
              aria-label="Account menu"
              onClick={() => setAccountOpen((v) => !v)}
            >
              <span className="account-initials">{initialsOf(data.user.name)}</span>
              {data.user.name}
            </button>
            {accountOpen && (
              <div className="account-pop">
                <p className="account-about">
                  About Crew
                  <em>Version 0.1.0</em>
                </p>
                <button onClick={() => openSettings("usage")}>Weekly usage</button>
                <button onClick={() => openSettings("general")}>Settings</button>
                <button className="danger" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </footer>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <button className="menu-btn" aria-label="Back" onClick={backHome}>
            ‹
          </button>
          <div className="plus-wrap desk-only">
            <button
              className="head-plus"
              aria-label="New"
              onClick={() => {
                setPlusOpen((v) => !v);
                setMoreOpen(false);
              }}
            >
              +
            </button>
            {plusOpen && (
              <div className="plus-pop">
                <button
                  onClick={() => {
                    setOverlay("newbot");
                    setPlusOpen(false);
                  }}
                >
                  Create new agent
                </button>
                <button
                  onClick={() => {
                    setOverlay("newgroup");
                    setPlusOpen(false);
                  }}
                >
                  New group
                </button>
              </div>
            )}
          </div>
          <div className="chat-title phone-center" onClick={() => setOverlay("agent")} role="button">
            {convo?.kind !== "group" && data.bots.find((b) => b.id === convo?.botIds[0]) && (
              <Avatar
                color={data.bots.find((b) => b.id === convo?.botIds[0])!.color}
                shape={data.bots.find((b) => b.id === convo?.botIds[0])!.shape}
                size={22}
                status={presence}
                title={live?.convoId === convo?.id ? live.action : statusLabel(presence)}
              />
            )}
            <div>
              <h1>{convo?.title}</h1>
              <p className="phone-only">
                {presence !== "idle"
                  ? statusLabel(presence)
                  : convo?.kind === "group"
                    ? convo.botIds
                        .map((id) => data.bots.find((b) => b.id === id)?.name)
                        .filter(Boolean)
                        .join(" · ")
                    : data.bots.find((b) => b.id === convo?.botIds[0])?.title}
              </p>
            </div>
          </div>
          <div className="head-actions">
            <button
              className={`comp-status phone-only ${working ? "on" : ""}`}
              onClick={() => setComputerLevel((l) => (l === "preview" ? "status" : "preview"))}
              title="Agent Computer"
            >
              <span />
            </button>
            <button
              className="icon-ghost"
              aria-label="Conversation details"
              title="Conversation details"
              onClick={() => setOverlay("agent")}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <path
                  d="M4 2.5h8v11L8 11.2 4 13.5v-11Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="more">
              <button className="ghost more-btn" aria-label="More" onClick={() => setMoreOpen((v) => !v)}>
                ⋯
              </button>
              {moreOpen && (
                <div className="more-pop">
                  <button
                    onClick={() => {
                      setComputerLevel("full");
                      setMoreOpen(false);
                    }}
                  >
                    Take control
                  </button>
                  <button
                    onClick={() => {
                      setOverlay("agent");
                      setMoreOpen(false);
                    }}
                  >
                    View conversation details
                  </button>
                  <button
                    onClick={() => {
                      setOverlay("market");
                      setMoreOpen(false);
                    }}
                  >
                    Marketplace
                  </button>
                  <button
                    onClick={() => {
                      markConversation(convo?.attention === "unread" ? "none" : "unread");
                      setMoreOpen(false);
                    }}
                  >
                    {convo?.attention === "unread" ? "Mark as read" : "Mark as unread"}
                  </button>
                  <button
                    onClick={() => {
                      openSettings("general");
                    }}
                  >
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="transcript" ref={scroller}>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay =
              !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            let runStart = i;
            while (runStart > 0 && messages[runStart - 1].role !== "user" && m.role !== "user") {
              runStart -= 1;
            }
            const endOfBotRun = m.role !== "user" && (!next || next.role === "user");
            const run = endOfBotRun ? messages.slice(runStart, i + 1) : [];
            const botName = data.bots.find((b) => b.id === (m.senderBotId || convo?.botIds[0]))?.name;
            return (
              <Fragment key={m.id}>
                {newDay && <div className="day-sep">{dayStamp(m.createdAt)}</div>}
                <MessageView
                  message={m}
                  approvals={data.approvals}
                  onApprove={async (id, decision) => {
                    await j("/api/approvals", { method: "POST", body: JSON.stringify({ id, decision }) });
                    await reload();
                  }}
                  onReact={async (emoji) => {
                    await j("/api/meta", { method: "POST", body: JSON.stringify({ messageId: m.id, emoji }) });
                    await reload();
                  }}
                />
                {endOfBotRun && (
                  <p className="thread-meta">{threadMetaLine(run, botName)}</p>
                )}
              </Fragment>
            );
          })}
          {pending && pending.conversationId === convo?.id && (
            <MessageView
              message={pending}
              approvals={data.approvals}
              onApprove={() => undefined}
              onReact={() => undefined}
            />
          )}
          {busy && convo && (
            <article className="msg typing-row">
              <div className="bubble">
                <div className="trace">{live?.action || statusLabel(presence)}</div>
              </div>
            </article>
          )}
        </div>

        {error && (
          <div className="notice-stack">
            <div className="notice-head">Notifications</div>
            <div className="banner notice">
              <p>{error}</p>
              <div className="row">
                <button type="button" onClick={() => setError(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="composer-wrap">
          {mentionOpen && (
            <div className="pop">
              {data.bots
                .filter((b) => convo?.botIds.includes(b.id) || true)
                .slice(0, 6)
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setDraft((d) => d.replace(/@(\w*)$/, `@${b.name.replace(/\s/g, "")} `));
                      setMentionOpen(false);
                    }}
                  >
                    @{b.name}
                  </button>
                ))}
              <button onClick={() => setDraft((d) => d.replace(/@(\w*)$/, "@everyone "))}>@everyone</button>
            </div>
          )}
          {slashOpen && (
            <div className="pop">
              {data.skills.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setDraft((d) => d.replace(/\/([a-z0-9-]*)$/i, `/${s.slug} `));
                    setSlashOpen(false);
                  }}
                >
                  /{s.slug} — {s.name}
                </button>
              ))}
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <button type="button" className="icon attach" title="Attachment" onClick={() => setDraft((d) => d + " [/workspace] ")}>
              +
            </button>
            <textarea
              value={draft}
              placeholder={convo ? `Bericht sturen naar ${convo.title}` : "Bericht sturen"}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
            />
            <button
              type="button"
              className="icon phone-only"
              title="Mic"
              onClick={() => {
                const w = window as unknown as {
                  webkitSpeechRecognition?: new () => {
                    lang: string;
                    onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
                    start: () => void;
                  };
                };
                const SR = w.webkitSpeechRecognition;
                if (!SR) {
                  setError("Speech is not available in this browser");
                  return;
                }
                const rec = new SR();
                rec.lang = "en-US";
                rec.onresult = (ev) => {
                  const t = ev.results[0][0].transcript;
                  setDraft((d) => `${d} ${t}`.trim());
                };
                rec.start();
              }}
            >
              ⌖
            </button>
            <button className="send" type="submit" disabled={busy || !draft.trim()} aria-label="Send">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
                <path
                  d="M3 8h9M8 3.5 12.5 8 8 12.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <p className="composer-llm muted">
            {data.activeLlm
              ? `Replies via ${data.activeLlm.label} · ${data.activeLlm.model}`
              : "Connect a free-tier key in Settings → Usage & Billing to run real models."}
          </p>
        </div>
      </main>

      <ComputerPane
        computer={data.computer}
        files={data.files}
        wallpaper={wallpaper}
        botName={convo?.title || "Bot"}
        full={computerLevel === "full"}
        open={computerLevel !== "status"}
        onClose={() => setComputerLevel("status")}
        onExpand={() => setComputerLevel("full")}
        onRefresh={async () => {
          await reload();
        }}
      />

      {overlay === "market" && (
        <Modal title="Marketplace" onClose={() => setOverlay("none")}>
          <Marketplace
            plugins={data.plugins}
            installs={data.installs}
            onInstall={async (pluginId) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ pluginId }) });
              await reload();
            }}
            onTemplate={async (templateId) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ templateId }) });
              await reload();
              setOverlay("none");
            }}
            onTools={async (pluginId, enabledTools, connected) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ pluginId, enabledTools, connected }) });
              await reload();
            }}
          />
        </Modal>
      )}

      {overlay === "settings" && (
        <Modal title="Settings" wide onClose={() => setOverlay("none")}>
          <SettingsPanel
            user={{
              email: data.user.email,
              name: data.user.name,
              timezone: data.user.timezone || "Europe/Amsterdam",
            }}
            keys={data.keys}
            rules={data.autoReviewRules}
            computer={data.computer}
            plugins={data.plugins}
            installs={data.installs}
            appearance={theme}
            activeLlm={data.activeLlm || null}
            initialTab={settingsTab}
            onAppearance={async (t) => {
              setTheme(t);
              await j("/api/session", { method: "PATCH", body: JSON.stringify({ appearance: t }) });
              await reload();
            }}
            onTimezone={async (tz) => {
              await j("/api/session", { method: "PATCH", body: JSON.stringify({ timezone: tz }) });
              await reload();
            }}
            onSaveKey={async (provider, secret) => {
              await j("/api/keys", { method: "POST", body: JSON.stringify({ provider, secret, test: true }) });
              await reload();
            }}
            onRemoveKey={async (provider) => {
              await j(`/api/keys?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
              await reload();
            }}
            onRule={async (pattern, mode) => {
              await j("/api/approvals", { method: "PUT", body: JSON.stringify({ pattern, mode }) });
              await reload();
            }}
            onDeleteRule={async (id) => {
              await j("/api/approvals", { method: "PUT", body: JSON.stringify({ id, delete: true }) });
              await reload();
            }}
            onLocalExecution={async (mode) => {
              await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "localExecution", localExecution: mode }) });
              await reload();
            }}
            onLocalEgress={async (on) => {
              await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "localEgress", localEgress: on }) });
              await reload();
            }}
            onUpdateComputer={async () => {
              await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "updateComputer" }) });
              await reload();
            }}
            onResetComputer={async () => {
              await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "resetComputer" }) });
              await reload();
            }}
            onInstallPlugin={async (pluginId) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ pluginId }) });
              await reload();
            }}
            onTemplate={async (templateId) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ templateId }) });
              await reload();
            }}
            onTools={async (pluginId, enabledTools, connected) => {
              await j("/api/marketplace", { method: "POST", body: JSON.stringify({ pluginId, enabledTools, connected }) });
              await reload();
            }}
            onLogout={async () => {
              await signOut();
            }}
          />
        </Modal>
      )}

      {overlay === "newbot" && (
        <Modal title="Create new agent" onClose={() => setOverlay("none")}>
          <NewBot
            onCreate={async (payload) => {
              const res = await j<{ bot: Bot }>("/api/bots", { method: "POST", body: JSON.stringify(payload) });
              await reload();
              openConvo("convo_" + res.bot.id);
              setOverlay("none");
            }}
          />
        </Modal>
      )}

      {overlay === "newgroup" && (
        <Modal title="New group" onClose={() => setOverlay("none")}>
          <NewGroup
            bots={data.bots}
            onCreate={async (botIds, title) => {
              const res = await j<{ conversation: Conversation }>("/api/conversations", {
                method: "POST",
                body: JSON.stringify({ kind: "group", botIds, title }),
              });
              await reload();
              setActiveId(res.conversation.id);
              setMobileScreen("chat");
              setOverlay("none");
            }}
          />
        </Modal>
      )}

      {overlay === "agent" && convo && (
        <Modal title="Conversation details" onClose={() => setOverlay("none")}>
          <AgentSettings
            convo={convo}
            bots={data.bots}
            onSave={async (botId, patch) => {
              await j("/api/bots", { method: "PATCH", body: JSON.stringify({ id: botId, ...patch }) });
              await reload();
            }}
            onHide={async (botId) => {
              await j("/api/bots", { method: "PATCH", body: JSON.stringify({ id: botId, hidden: true }) });
              await reload();
              setOverlay("none");
              setMobileScreen("home");
            }}
            onMark={(attention) => {
              void j("/api/conversations", { method: "PATCH", body: JSON.stringify({ id: convo.id, attention }) });
              setData((d) => ({
                ...d,
                conversations: d.conversations.map((c) => (c.id === convo.id ? { ...c, attention } : c)),
              }));
            }}
          />
        </Modal>
      )}

      {overlay === "palette" && (
        <Modal title="Search" onClose={() => setOverlay("none")}>
          <input
            className="full"
            autoFocus
            placeholder="Bots, messages, files, skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchResults
            query={query}
            onOpenConvo={(id) => {
              openConvo(id);
              setOverlay("none");
            }}
            conversations={data.conversations}
            bots={data.bots}
            files={data.files}
            skills={data.skills}
          />
        </Modal>
      )}
    </div>
  );
}

function MessageView({
  message,
  approvals,
  onApprove,
  onReact,
}: {
  message: Message;
  approvals: Approval[];
  onApprove: (id: string, decision: "allowed" | "denied" | "always") => void;
  onReact: (emoji: string) => void;
}) {
  const mine = message.role === "user";
  const pending = approvals.find((a) => a.messageId === message.id && a.status === "pending");

  return (
    <article className={`msg ${mine ? "mine" : ""} kind-${message.kind}`}>
      <div className="bubble">
        {message.kind === "trace" && <div className="trace">{message.content}</div>}
        {message.kind === "handoff" && <div className="event">Handoff · {message.content}</div>}
        {message.kind === "event" && <div className="event">{message.content}</div>}
        {message.kind === "card" && message.card?.type === "email" && (
          <div className="card">
            <strong>New email</strong>
            <p>To {String(message.card.to)}</p>
            <p>{String(message.card.subject)}</p>
            <pre>{String(message.card.body)}</pre>
          </div>
        )}
        {message.kind === "card" && message.card?.type === "routine" && (
          <div className="card">
            <strong>Routine</strong>
            <p>
              {String(message.card.name)} · {String(message.card.schedule)}
            </p>
          </div>
        )}
        {message.kind === "approval" && (
          <div className="card">
            <strong>Approval</strong>
            <p>{message.content}</p>
            {pending && (
              <div className="row">
                <button onClick={() => onApprove(pending.id, "allowed")}>Allow once</button>
                <button onClick={() => onApprove(pending.id, "always")}>Always allow</button>
                <button className="danger" onClick={() => onApprove(pending.id, "denied")}>
                  Deny
                </button>
              </div>
            )}
          </div>
        )}
        {(message.kind === "text" || !["trace", "handoff", "event", "card", "approval"].includes(message.kind)) && (
          <RichText text={message.content} />
        )}
        {!mine && (
          <div className="react">
            {["👍", "👀", "✅"].map((e) => (
              <button key={e} onClick={() => onReact(e)}>
                {e}
                {message.reactions?.[e] ? ` ${message.reactions[e]}` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="msg-actions">
        <button
          type="button"
          title="Copy"
          onClick={() => void navigator.clipboard.writeText(message.content)}
        >
          ⎘
        </button>
        <button type="button" title="Share" onClick={() => void navigator.clipboard.writeText(message.content)}>
          ↗
        </button>
        {!mine && (
          <button type="button" title="React" onClick={() => onReact("❤️")}>
            …
          </button>
        )}
      </div>
    </article>
  );
}

function ComputerPane({
  computer,
  files,
  wallpaper,
  botName,
  full,
  open,
  onClose,
  onExpand,
  onRefresh,
}: {
  computer: ComputerState;
  files: WorkspaceFile[];
  wallpaper: string;
  botName: string;
  full: boolean;
  open: boolean;
  onClose: () => void;
  onExpand: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [cmd, setCmd] = useState("ls /workspace");
  const [url, setUrl] = useState(computer.url);
  const [out, setOut] = useState("");
  const showDesktop = computer.active || full;

  return (
    <section className={`computer ${full ? "full" : "docked"} ${open || full ? "open" : ""} ${computer.active ? "live" : ""}`}>
      <header className="screen-head">
        <span className="screen-ico" aria-hidden>
          ⌗
        </span>
        <button className="icon-ghost" onClick={onExpand} aria-label="Expand screen">
          ⛶
        </button>
        {(full || open) && (
          <button className="phone-only icon-ghost" onClick={onClose} aria-label="Close screen">
            ×
          </button>
        )}
      </header>
      {showDesktop ? (
        <>
          <div className="desktop" style={{ backgroundImage: wallpaper }}>
            <div className="grain" />
            <div className="window">
              <div className="urlbar">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "navigate", url }) });
                    await onRefresh();
                  }}
                >
                  <input value={url} onChange={(e) => setUrl(e.target.value)} />
                </form>
              </div>
              <div className="page">
                <p className="muted">{computer.status}</p>
                <h3>{computer.title}</h3>
                <p>{computer.url}</p>
                <ul>
                  {computer.logs.slice(0, 6).map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
                {computer.takeover && (
                  <p className="warn">Sensitive step — finish login or 2FA here. Don’t paste codes in chat.</p>
                )}
              </div>
              <span className="cursor" style={{ left: `${computer.cursor.x}%`, top: `${computer.cursor.y}%` }} />
            </div>
          </div>
          <div className="comp-tools">
            <button
              onClick={async () => {
                await j("/api/computer", { method: "POST", body: JSON.stringify({ action: computer.takeover ? "release" : "takeover" }) });
                await onRefresh();
              }}
            >
              {computer.takeover ? "Return control" : "Take control"}
            </button>
            <button
              onClick={async () => {
                await j("/api/computer", { method: "POST", body: JSON.stringify({ action: "updateComputer" }) });
                await onRefresh();
              }}
            >
              Recover computer
            </button>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await j<{ output: string }>("/api/computer", {
                  method: "POST",
                  body: JSON.stringify({ action: "sandbox", value: cmd }),
                });
                setOut(res.output);
                await onRefresh();
              }}
            >
              <input value={cmd} onChange={(e) => setCmd(e.target.value)} />
            </form>
          </div>
          {out && <pre className="term">{out}</pre>}
          <div className="files">
            {files.map((f) => (
              <details key={f.path}>
                <summary>{f.path}</summary>
                <pre>{f.content}</pre>
              </details>
            ))}
          </div>
        </>
      ) : (
        <div className="screen-idle">
          <p className="screen-title">Scherm van {botName}</p>
          <p className="screen-hint">
            Routines zijn terugkerende taken die deze Bot volgens een schema uitvoert. Vraag hem in de chat om er een te
            stellen.
          </p>
        </div>
      )}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Marketplace({
  plugins,
  installs,
  onInstall,
  onTemplate,
  onTools,
}: {
  plugins: Plugin[];
  installs: PluginInstall[];
  onInstall: (id: string) => Promise<void>;
  onTemplate: (id: string) => Promise<void>;
  onTools: (id: string, tools: string[], connected: boolean) => Promise<void>;
}) {
  const [tab, setTab] = useState<"plugins" | "bots">("plugins");
  return (
    <div>
      <div className="tabs">
        <button className={tab === "plugins" ? "on" : ""} onClick={() => setTab("plugins")}>
          Marketplace
        </button>
        <button className={tab === "bots" ? "on" : ""} onClick={() => setTab("bots")}>
          Yours
        </button>
      </div>
      {tab === "plugins" &&
        plugins.map((p) => {
          const inst = installs.find((i) => i.pluginId === p.id);
          return (
            <div className="market-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.summary}</p>
              </div>
              {inst ? (
                <label>
                  <input
                    type="checkbox"
                    checked={inst.connected}
                    onChange={(e) => void onTools(p.id, inst.enabledTools, e.target.checked)}
                  />
                  Connected
                </label>
              ) : (
                <button onClick={() => void onInstall(p.id)}>Add</button>
              )}
            </div>
          );
        })}
      {tab === "bots" &&
        BOT_TEMPLATES.map((t) => (
          <div className="market-row" key={t.id}>
            <div>
              <strong>{t.name}</strong>
              <p>{t.description}</p>
            </div>
            <button onClick={() => void onTemplate(t.id)}>Add to Crew</button>
          </div>
        ))}
    </div>
  );
}

function AgentSettings({
  convo,
  bots,
  onSave,
  onHide,
  onMark,
}: {
  convo: Conversation;
  bots: Bot[];
  onSave: (
    id: string,
    patch: {
      name?: string;
      title?: string;
      description?: string;
      notifications?: boolean;
      color?: string;
      shape?: AvatarShape;
    },
  ) => Promise<void>;
  onHide: (id: string) => Promise<void>;
  onMark: (attention: "none" | "unread") => void;
}) {
  const primary = bots.find((b) => b.id === convo.botIds[0]);
  const [name, setName] = useState(primary?.name || convo.title);
  const [title, setTitle] = useState(primary?.title || "");
  const [description, setDescription] = useState(primary?.description || "");
  const [color, setColor] = useState(primary?.color || AVATAR_COLORS[0]);
  const [shape, setShape] = useState<AvatarShape>(primary?.shape || AVATAR_SHAPES[0]);
  const [notifications, setNotifications] = useState(primary?.notifications ?? true);
  const [saved, setSaved] = useState(false);
  if (convo.kind === "group") {
    return (
      <div className="stack-form">
        <h3>Group</h3>
        <p>{convo.title}</p>
        <p className="muted">{convo.botIds.map((id) => bots.find((b) => b.id === id)?.name).filter(Boolean).join(" · ")}</p>
        <p className="muted">Group chats don’t have a per-Bot notification switch.</p>
      </div>
    );
  }
  if (!primary) return <p className="muted">No agent on this conversation.</p>;
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(primary.id, { name, title, description, notifications, color, shape });
        setSaved(true);
      }}
    >
      <section className="settings-section">
        <h3>Agent settings</h3>
        <p className="muted">Name, title, description, avatar, and notifications belong to this Bot alone.</p>
        <div className="newbot-preview">
          <Avatar color={color} shape={shape} size={56} status="idle" />
          <div>
            <strong>{name}</strong>
            <p className="muted">{title || "Untitled role"}</p>
          </div>
        </div>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <p className="field-label">Avatar</p>
        <div className="swatches">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${c === color ? "on" : ""}`}
              style={{ background: c }}
              aria-label={c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="row">
          {AVATAR_SHAPES.map((s) => (
            <button key={s} type="button" className={s === shape ? "on" : ""} onClick={() => setShape(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-section">
        <h3>Notifications</h3>
        <label className="toggle">
          <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
          Notifications
        </label>
        <p className="muted">
          Notify when this Bot finishes or needs input. Notifications are suppressed while Crew is focused.
          The sidebar still shows unread activity.
        </p>
      </section>
      <div className="row">
        <button type="submit">Save profile</button>
        <button type="button" onClick={() => onMark(convo.attention === "unread" ? "none" : "unread")}>
          {convo.attention === "unread" ? "Mark as read" : "Mark as unread"}
        </button>
      </div>
      {saved && <p className="muted">Saved.</p>}
      <button type="button" className="danger" onClick={() => void onHide(primary.id)}>
        Hide from sidebar
      </button>
    </form>
  );
}

function NewBot({
  onCreate,
}: {
  onCreate: (p: { name: string; title: string; description: string; color: string; shape: AvatarShape }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [shape, setShape] = useState<AvatarShape>(AVATAR_SHAPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewStatus: BotStatus = busy ? "thinking" : "idle";
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          await onCreate({ name, title, description, color, shape });
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <div className="newbot-preview">
        <Avatar color={color} shape={shape} size={64} status={previewStatus} title={statusLabel(previewStatus)} />
        <div>
          <strong>{name || "New Agent"}</strong>
          <p className="muted">{title || "Untitled role"}</p>
        </div>
      </div>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Description — the job this Bot owns" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="swatches">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${c === color ? "on" : ""}`}
            style={{ background: c }}
            aria-label={c}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="row">
        {AVATAR_SHAPES.map((s) => (
          <button key={s} type="button" className={s === shape ? "on" : ""} onClick={() => setShape(s)}>
            {s}
          </button>
        ))}
      </div>
      {error && <div className="banner">{error}</div>}
      <button type="submit" disabled={busy || !name.trim()}>
        {busy ? "Creating…" : "Create"}
      </button>
    </form>
  );
}

function NewGroup({
  bots,
  onCreate,
}: {
  bots: Bot[];
  onCreate: (ids: string[], title: string) => Promise<void>;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate(ids, title);
      }}
    >
      <input placeholder="Group name" value={title} onChange={(e) => setTitle(e.target.value)} />
      {bots.map((b) => (
        <label key={b.id}>
          <input
            type="checkbox"
            checked={ids.includes(b.id)}
            onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, b.id] : cur.filter((x) => x !== b.id)))}
          />
          {b.name}
        </label>
      ))}
      <button type="submit" disabled={ids.length < 2 || ids.length > 6}>
        Start group
      </button>
    </form>
  );
}

function SearchResults({
  query,
  conversations,
  bots,
  files,
  skills,
  onOpenConvo,
}: {
  query: string;
  conversations: Conversation[];
  bots: Bot[];
  files: WorkspaceFile[];
  skills: Skill[];
  onOpenConvo: (id: string) => void;
}) {
  const q = query.toLowerCase();
  if (!q) return <p className="muted">Type to search</p>;
  return (
    <div className="search">
      {conversations
        .filter((c) => c.title.toLowerCase().includes(q) || c.lastPreview.toLowerCase().includes(q))
        .map((c) => (
          <button key={c.id} onClick={() => onOpenConvo(c.id)}>
            Chat · {c.title}
          </button>
        ))}
      {bots
        .filter((b) => b.name.toLowerCase().includes(q))
        .map((b) => (
          <div key={b.id}>Bot · {b.name}</div>
        ))}
      {files
        .filter((f) => f.path.toLowerCase().includes(q))
        .map((f) => (
          <div key={f.path}>File · {f.path}</div>
        ))}
      {skills
        .filter((s) => s.slug.includes(q) || s.name.toLowerCase().includes(q))
        .map((s) => (
          <div key={s.id}>
            /{s.slug} · {s.name}
          </div>
        ))}
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function dayStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("nl-NL", { hour: "numeric", minute: "2-digit" });
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Vandaag ${time}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Gisteren ${time}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} ${time}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function threadMetaLine(run: Message[], botName?: string): string {
  const reactions = run.flatMap((m) => Object.entries(m.reactions || {}).filter(([, n]) => n > 0));
  const emoji = reactions[0]?.[0] || "";
  const withBit = emoji ? ` met ${emoji}` : "";
  return `${run.length} bericht${run.length === 1 ? "" : "en"}${withBit}${botName ? ` ${botName}` : ""}`;
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)|(?:websites\/[^\s]+))/gi);
  return (
    <p>
      {parts.map((part, i) => {
        if (!part) return null;
        const isLink =
          /^https?:\/\//i.test(part) ||
          /^websites\//i.test(part) ||
          /^[a-z0-9.-]+\.[a-z]{2,}/i.test(part);
        if (!isLink) return <Fragment key={i}>{part}</Fragment>;
        const href = part.startsWith("http") ? part : `https://${part}`;
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer">
            {part}
          </a>
        );
      })}
    </p>
  );
}

