"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type Bootstrap = {
  user: { id: string; email: string; name: string; appearance: string };
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
};

type Overlay = "none" | "market" | "settings" | "newbot" | "newgroup" | "palette";

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
  const [computerLevel, setComputerLevel] = useState<"status" | "preview" | "full">("status");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
    return () => {
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "palette" ? "none" : "palette"));
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
    setLive({ convoId: convo.id, botId, status: "thinking", action: "Leest je bericht" });
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      setLive((cur) =>
        cur && cur.convoId === convo.id && cur.status === "thinking"
          ? { ...cur, status: "working", action: "Aan het werk" }
          : cur,
      );
    }, 420);
    try {
      await j("/api/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId: convo.id, content }),
      });
      const next = await reload();
      setPending(null);
      const nextConvo = next.conversations.find((c) => c.id === convo.id);
      if (nextConvo?.attention === "needs") {
        setLive({ convoId: convo.id, botId, status: "blocked", action: "Hulp nodig" });
      } else if (next.computer.active) {
        setLive({
          convoId: convo.id,
          botId,
          status: "working",
          action: next.computer.status || "Computer",
        });
      } else {
        setLive({ convoId: convo.id, botId, status: "done", action: "Klaar" });
        liveTimer.current = window.setTimeout(() => {
          setLive((cur) => (cur && cur.status === "done" ? null : cur));
        }, 700);
      }
    } catch (err) {
      setError((err as Error).message);
      setDraft(content);
      setPending(null);
      setLive({ convoId: convo.id, botId, status: "blocked", action: "Mislukt" });
    } finally {
      setBusy(false);
    }
  }

  function openConvo(id: string) {
    if (convo) setDrafts((d) => ({ ...d, [convo.id]: draft }));
    setActiveId(id);
    setDraft(drafts[id] || "");
    setRosterOpen(false);
    setMobileScreen("chat");
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
  }

  function onDraft(value: string) {
    setDraft(value);
    const at = /(?:^|\s)@(\w*)$/.exec(value);
    const sl = /(?:^|\s)\/([a-z0-9-]*)$/i.exec(value);
    setMentionOpen(Boolean(at));
    setSlashOpen(Boolean(sl));
  }

  const hour = new Date().getHours();
  const wallpaper = `radial-gradient(1200px 600px at 20% 10%, hsl(${200 + hour * 4} 40% ${theme === "dark" ? 18 : 72}%), transparent),
    linear-gradient(180deg, hsl(${210 + hour} 28% ${theme === "dark" ? 10 : 86}%), hsl(${230} 30% ${theme === "dark" ? 6 : 92}%))`;

  return (
    <div className={`crew-root ${theme} phone-${mobileScreen} ${rosterOpen ? "roster-open" : ""} ${draft.trim() ? "has-draft" : ""}`}>
      {rosterOpen && <button className="scrim" aria-label="Sluit lijst" onClick={() => setRosterOpen(false)} />}
      <aside className={`roster ${rosterOpen ? "open" : ""}`}>
        <header className="roster-head desk-bar">
          <div className="brand">
            <span className="brand-mark" />
            Crew
          </div>
          <button className="ghost" onClick={() => setOverlay("palette")} title="Zoeken">
            Zoek
          </button>
        </header>
        <header className="ios-home-head">
          <h1>Crew</h1>
          <div className="ios-home-actions">
            <button className="icon-round" aria-label="Zoeken" onClick={() => setOverlay("palette")}>
              ⌕
            </button>
            <button className="icon-round" aria-label="Instellingen" onClick={() => setOverlay("settings")}>
              ⚙
            </button>
            <button className="icon-round plus" aria-label="Nieuw" onClick={() => setMoreOpen((v) => !v)}>
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
              Nieuwe bot
            </button>
            <button
              onClick={() => {
                setOverlay("newgroup");
                setMoreOpen(false);
              }}
            >
              Nieuwe groep
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
          {data.conversations.map((c) => {
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
          <button onClick={() => setOverlay("newbot")}>Nieuwe bot</button>
          <button onClick={() => setOverlay("newgroup")}>Nieuwe groep</button>
        </footer>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <button className="menu-btn" aria-label="Terug" onClick={backHome}>
            ‹
          </button>
          <div className="chat-title phone-center">
            {convo?.kind !== "group" && data.bots.find((b) => b.id === convo?.botIds[0]) && (
              <Avatar
                color={data.bots.find((b) => b.id === convo?.botIds[0])!.color}
                shape={data.bots.find((b) => b.id === convo?.botIds[0])!.shape}
                size={28}
                status={presence}
                title={live?.convoId === convo?.id ? live.action : statusLabel(presence)}
              />
            )}
            <div>
              <h1>{convo?.title}</h1>
              <p>
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
              className={`comp-status ${working ? "on" : ""}`}
              onClick={() => setComputerLevel((l) => (l === "preview" ? "status" : "preview"))}
              title="Computer"
            >
              <span />
              <em className="desk-label">Computer</em>
            </button>
            <button className="ghost desk-only" onClick={() => setComputerLevel("full")}>
              Takeover
            </button>
            <button className="ghost desk-only" onClick={() => setOverlay("market")}>
              Marketplace
            </button>
            <button className="ghost desk-only" onClick={() => setOverlay("settings")}>
              Instellingen
            </button>
            <div className="more">
              <button className="ghost more-btn" aria-label="Meer" onClick={() => setMoreOpen((v) => !v)}>
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
                    Takeover
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
                      setOverlay("settings");
                      setMoreOpen(false);
                    }}
                  >
                    Instellingen
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="transcript" ref={scroller}>
          {messages.map((m) => (
            <MessageView
              key={m.id}
              message={m}
              bots={data.bots}
              approvals={data.approvals}
              status={m.senderBotId ? presenceOf(convo, m.senderBotId) : "idle"}
              onApprove={async (id, decision) => {
                await j("/api/approvals", { method: "POST", body: JSON.stringify({ id, decision }) });
                await reload();
              }}
              onReact={async (emoji) => {
                await j("/api/meta", { method: "POST", body: JSON.stringify({ messageId: m.id, emoji }) });
                await reload();
              }}
            />
          ))}
          {pending && pending.conversationId === convo?.id && (
            <MessageView
              message={pending}
              bots={data.bots}
              approvals={data.approvals}
              status="idle"
              onApprove={() => undefined}
              onReact={() => undefined}
            />
          )}
          {busy && convo && (
            <article className="msg typing-row">
              {data.bots.find((b) => b.id === convo.botIds[0]) && (
                <Avatar
                  color={data.bots.find((b) => b.id === convo.botIds[0])!.color}
                  shape={data.bots.find((b) => b.id === convo.botIds[0])!.shape}
                  size={28}
                  status={presence}
                  title={live?.action || statusLabel(presence)}
                />
              )}
              <div className="bubble">
                <span className="who">{data.bots.find((b) => b.id === convo.botIds[0])?.name}</span>
                <div className="trace">{live?.action || statusLabel(presence)}</div>
              </div>
            </article>
          )}
        </div>

        {error && <div className="banner">{error}</div>}

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
            <button type="button" className="icon" title="Bijlage" onClick={() => setDraft((d) => d + " [/workspace] ")}>
              +
            </button>
            <textarea
              value={draft}
                  placeholder={convo ? `Bericht ${convo.title}` : "Bericht"}
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
              className="icon"
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
                  setError("Spraak niet beschikbaar in deze browser");
                  return;
                }
                const rec = new SR();
                rec.lang = "nl-NL";
                rec.onresult = (ev) => {
                  const t = ev.results[0][0].transcript;
                  setDraft((d) => `${d} ${t}`.trim());
                };
                rec.start();
              }}
            >
              ⌖
            </button>
            <button className="send" type="submit" disabled={busy}>
              ➤
            </button>
          </form>
        </div>
      </main>

      {computerLevel !== "status" && (
        <ComputerPane
          computer={data.computer}
          files={data.files}
          wallpaper={wallpaper}
          full={computerLevel === "full"}
          onClose={() => setComputerLevel("status")}
          onExpand={() => setComputerLevel("full")}
          onRefresh={async () => {
            await reload();
          }}
        />
      )}

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
        <Modal title="Instellingen" onClose={() => setOverlay("none")}>
          <Settings
            keys={data.keys}
            rules={data.autoReviewRules}
            theme={theme}
            onTheme={setTheme}
            onSaveKey={async (provider, secret) => {
              await j("/api/keys", { method: "POST", body: JSON.stringify({ provider, secret }) });
              await reload();
            }}
            onRule={async (pattern, mode) => {
              await j("/api/approvals", { method: "PUT", body: JSON.stringify({ pattern, mode }) });
              await reload();
            }}
            onLogout={async () => {
              await j("/api/session", { method: "DELETE" });
              window.location.reload();
            }}
          />
        </Modal>
      )}

      {overlay === "newbot" && (
        <Modal title="Nieuwe bot" onClose={() => setOverlay("none")}>
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
        <Modal title="Nieuwe groep" onClose={() => setOverlay("none")}>
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

      {overlay === "palette" && (
        <Modal title="Zoeken" onClose={() => setOverlay("none")}>
          <input
            className="full"
            autoFocus
            placeholder="Bots, berichten, files, skills…"
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
  bots,
  approvals,
  status = "idle",
  onApprove,
  onReact,
}: {
  message: Message;
  bots: Bot[];
  approvals: Approval[];
  status?: BotStatus;
  onApprove: (id: string, decision: "allowed" | "denied" | "always") => void;
  onReact: (emoji: string) => void;
}) {
  const bot = bots.find((b) => b.id === message.senderBotId);
  const mine = message.role === "user";
  const pending = approvals.find((a) => a.messageId === message.id && a.status === "pending");

  return (
    <article className={`msg ${mine ? "mine" : ""} kind-${message.kind}`}>
      {!mine && bot && <Avatar color={bot.color} shape={bot.shape} size={28} status={status} title={statusLabel(status)} />}
      <div className="bubble">
        {!mine && bot && <span className="who">{bot.name}</span>}
        {message.kind === "trace" && <div className="trace">{message.content}</div>}
        {message.kind === "handoff" && <div className="event">Handoff · {message.content}</div>}
        {message.kind === "event" && <div className="event">{message.content}</div>}
        {message.kind === "card" && message.card?.type === "email" && (
          <div className="card">
            <strong>Nieuwe e-mail</strong>
            <p>Aan {String(message.card.to)}</p>
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
            <strong>Goedkeuring</strong>
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
          <p>{message.content}</p>
        )}
        <div className="react">
          {["👍", "👀", "✅"].map((e) => (
            <button key={e} onClick={() => onReact(e)}>
              {e}
              {message.reactions?.[e] ? ` ${message.reactions[e]}` : ""}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function ComputerPane({
  computer,
  files,
  wallpaper,
  full,
  onClose,
  onExpand,
  onRefresh,
}: {
  computer: ComputerState;
  files: WorkspaceFile[];
  wallpaper: string;
  full: boolean;
  onClose: () => void;
  onExpand: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [cmd, setCmd] = useState("ls /workspace");
  const [url, setUrl] = useState(computer.url);
  const [out, setOut] = useState("");

  return (
    <section className={`computer ${full ? "full" : ""}`}>
      <header>
        <span className="traffic">
          <i />
          <i />
          <i />
        </span>
        <strong>{computer.takeover ? "Jij bestuurt" : "Crew Computer"}</strong>
        <button onClick={onExpand}>⛶</button>
        <button onClick={onClose}>×</button>
      </header>
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
            {computer.takeover && <p className="warn">Gevoelige stap — voltooi login/2FA hier, plak geen codes in chat.</p>}
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
          {computer.takeover ? "Teruggeven" : "Overnemen"}
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
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
          Plugins
        </button>
        <button className={tab === "bots" ? "on" : ""} onClick={() => setTab("bots")}>
          Bots
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
                  aan
                </label>
              ) : (
                <button onClick={() => void onInstall(p.id)}>Install</button>
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
            <button onClick={() => void onTemplate(t.id)}>Toevoegen</button>
          </div>
        ))}
    </div>
  );
}

function Settings({
  keys,
  rules,
  theme,
  onTheme,
  onSaveKey,
  onRule,
  onLogout,
}: {
  keys: { provider: string; last4: string }[];
  rules: AutoReviewRule[];
  theme: "dark" | "light";
  onTheme: (t: "dark" | "light") => void;
  onSaveKey: (provider: string, secret: string) => Promise<void>;
  onRule: (pattern: string, mode: "ask_first" | "allow") => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [provider, setProvider] = useState("openai");
  const [secret, setSecret] = useState("");
  const [pattern, setPattern] = useState("send_email");
  return (
    <div className="settings">
      <h3>Weergave</h3>
      <div className="row">
        <button className={theme === "dark" ? "on" : ""} onClick={() => onTheme("dark")}>
          Donker
        </button>
        <button className={theme === "light" ? "on" : ""} onClick={() => onTheme("light")}>
          Licht
        </button>
      </div>
      <h3>Eigen API keys</h3>
      <p className="muted">Keys worden versleuteld opgeslagen. Nooit plaintext terug.</p>
      <ul>
        {keys.map((k) => (
          <li key={k.provider}>
            {k.provider}: {k.last4}
          </li>
        ))}
      </ul>
      <div className="row">
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          {["openai", "anthropic", "google", "xai", "openrouter", "browserbase", "e2b"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input type="password" placeholder="sk-…" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <button
          onClick={async () => {
            await onSaveKey(provider, secret);
            setSecret("");
          }}
        >
          Opslaan
        </button>
      </div>
      <h3>Auto-review</h3>
      <ul>
        {rules.map((r) => (
          <li key={r.id}>
            {r.mode}: {r.pattern}
          </li>
        ))}
      </ul>
      <div className="row">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} />
        <button onClick={() => void onRule(pattern, "ask_first")}>Ask first</button>
      </div>
      <button className="danger" onClick={() => void onLogout()}>
        Uitloggen
      </button>
    </div>
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
          <strong>{name || "Nieuwe teammate"}</strong>
          <p className="muted">{title || "Specialist"}</p>
        </div>
      </div>
      <input placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Rol / titel" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Waarvoor is deze bot er?" value={description} onChange={(e) => setDescription(e.target.value)} />
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
        {busy ? "Aanmaken…" : "Aanmaken"}
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
      <input placeholder="Groepsnaam" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        Groep starten
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
  if (!q) return <p className="muted">Typ om te zoeken</p>;
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

