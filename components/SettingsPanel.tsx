"use client";

import { useEffect, useState } from "react";
import { InstallCrew } from "./Pwa";
import { FREE_LLM_PROVIDERS, isFreeLlmProvider } from "@/lib/providers";
import type { AutoReviewRule, ComputerState, Plugin, PluginInstall } from "@/lib/types";
import { BOT_TEMPLATES } from "@/lib/catalog";

export type SettingsTab = "general" | "computer" | "plugins" | "usage" | "team" | "beta";
type Appearance = "system" | "light" | "dark";
type LocalExecution = "ask" | "always" | "never";

const NAV: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "computer", label: "Computer" },
  { id: "plugins", label: "Plugins" },
  { id: "usage", label: "Usage & Billing" },
  { id: "team", label: "Team Setup" },
  { id: "beta", label: "Beta" },
];

export function SettingsPanel({
  user,
  keys,
  rules,
  computer,
  plugins,
  installs,
  appearance,
  initialTab = "general",
  onAppearance,
  onTimezone,
  onSaveKey,
  onRemoveKey,
  onRule,
  onDeleteRule,
  onLocalExecution,
  onLocalEgress,
  onUpdateComputer,
  onResetComputer,
  onInstallPlugin,
  onTemplate,
  onTools,
  onLogout,
}: {
  user: { email: string; name: string; timezone: string };
  keys: { provider: string; last4: string }[];
  rules: AutoReviewRule[];
  computer: ComputerState;
  plugins: Plugin[];
  installs: PluginInstall[];
  appearance: Appearance;
  initialTab?: SettingsTab;
  onAppearance: (t: Appearance) => Promise<void>;
  onTimezone: (tz: string) => Promise<void>;
  onSaveKey: (provider: string, secret: string) => Promise<void>;
  onRemoveKey: (provider: string) => Promise<void>;
  onRule: (pattern: string, mode: "ask_first" | "allow") => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onLocalExecution: (mode: LocalExecution) => Promise<void>;
  onLocalEgress: (on: boolean) => Promise<void>;
  onUpdateComputer: () => Promise<void>;
  onResetComputer: () => Promise<void>;
  onInstallPlugin: (id: string) => Promise<void>;
  onTemplate: (id: string) => Promise<void>;
  onTools: (id: string, tools: string[], connected: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  return (
    <div className="settings-shell">
      <nav className="settings-nav" aria-label="Settings">
        {NAV.map(({ id, label }) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="settings-pane">
        {tab === "general" && (
          <GeneralPane
            user={user}
            rules={rules}
            appearance={appearance}
            localExecution={computer.localExecution || "ask"}
            onAppearance={onAppearance}
            onTimezone={onTimezone}
            onRule={onRule}
            onDeleteRule={onDeleteRule}
            onLocalExecution={onLocalExecution}
            onLogout={onLogout}
          />
        )}
        {tab === "computer" && (
          <ComputerSettings computer={computer} onLocalEgress={onLocalEgress} />
        )}
        {tab === "plugins" && (
          <PluginsPane
            plugins={plugins}
            installs={installs}
            onInstall={onInstallPlugin}
            onTemplate={onTemplate}
            onTools={onTools}
          />
        )}
        {tab === "usage" && (
          <UsagePane keys={keys} onSaveKey={onSaveKey} onRemoveKey={onRemoveKey} />
        )}
        {tab === "team" && <TeamSetupPane />}
        {tab === "beta" && (
          <BetaPane onUpdateComputer={onUpdateComputer} onResetComputer={onResetComputer} />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function GeneralPane({
  user,
  rules,
  appearance,
  localExecution,
  onAppearance,
  onTimezone,
  onRule,
  onDeleteRule,
  onLocalExecution,
  onLogout,
}: {
  user: { email: string; name: string; timezone: string };
  rules: AutoReviewRule[];
  appearance: Appearance;
  localExecution: LocalExecution;
  onAppearance: (t: Appearance) => Promise<void>;
  onTimezone: (tz: string) => Promise<void>;
  onRule: (pattern: string, mode: "ask_first" | "allow") => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onLocalExecution: (mode: LocalExecution) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [pattern, setPattern] = useState("send_email");

  return (
    <>
      <Section title="Account">
        <div className="settings-row">
          <div>
            <strong>{user.name}</strong>
            <p className="muted">{user.email}</p>
          </div>
          <button className="danger" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
        <div className="settings-row">
          <div>
            <strong>About Crew</strong>
            <p className="muted">Version 0.1.0</p>
          </div>
        </div>
        <p className="muted">
          Sign in or out of the account Crew uses. The account menu also shows About, the installed
          version, and a link to the iOS or Android app.
        </p>
        <InstallCrew variant="settings" />
      </Section>

      <Section title="Appearance">
        <div className="row">
          {(
            [
              ["system", "Follow System"],
              ["light", "Light"],
              ["dark", "Dark"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={appearance === id ? "on" : ""} onClick={() => void onAppearance(id)}>
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Agent">
        <label className="field">
          Timezone
          <select value={user.timezone} onChange={(e) => void onTimezone(e.target.value)}>
            {["Europe/Amsterdam", "Europe/London", "UTC", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"].map(
              (tz) => (
                <option key={tz}>{tz}</option>
              ),
            )}
          </select>
        </label>
        <p className="muted">Routines use this timezone for schedules.</p>
        <p className="field-label">Execution on Local Computer</p>
        <div className="row stacked-choice">
          {(
            [
              ["ask", "Ask every time"],
              ["always", "Always allowed"],
              ["never", "Never allowed"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={localExecution === id ? "on" : ""} onClick={() => void onLocalExecution(id)}>
              {label}
            </button>
          ))}
        </div>
        <p className="muted">
          Default is Ask every time. This applies to the desktop in front of you. Never allowed keeps
          Bots on the cloud computer only. These settings do not prevent a Bot from using Agent Computer.
        </p>
        <p className="muted">Crew manages model selection from your connected free-tier providers. There is no model picker.</p>
      </Section>

      <Section title="Auto-review">
        <p className="muted">
          Ask first always stops matching actions. Allow automatically proceeds unless another rule
          stops it. Ask first wins when rules conflict. Personal rules are stored on this desktop and
          synced to its Agent Computer.
        </p>
        <p className="muted">No rules required by your admin.</p>
        <ul className="rule-list">
          {rules.length === 0 && <li className="muted">No personal Auto-review rules yet.</li>}
          {rules.map((r) => (
            <li key={r.id}>
              <span>
                {r.mode === "ask_first" ? "Ask first" : "Allow automatically"} · {r.pattern}
              </span>
              <button className="ghost" onClick={() => void onDeleteRule(r.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="row">
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Action pattern" />
          <button onClick={() => void onRule(pattern, "ask_first")}>Ask first</button>
          <button onClick={() => void onRule(pattern, "allow")}>Allow automatically</button>
        </div>
      </Section>
    </>
  );
}

function ComputerSettings({
  computer,
  onLocalEgress,
}: {
  computer: ComputerState;
  onLocalEgress: (on: boolean) => Promise<void>;
}) {
  return (
    <>
      <Section title="Route traffic through your desktop">
        <label className="toggle">
          <input type="checkbox" checked={computer.localEgress} onChange={(e) => void onLocalEgress(e.target.checked)} />
          Route egress through this desktop
        </label>
        <p className="muted">
          Send Agent Computer web traffic through this desktop. Destinations see this desktop’s IP
          address, and the Bot can reach networks available from this device. The setting applies to
          one desktop. If a team admin turns off Allow Local Egress, the toggle locks with “Your
          team’s admin has turned off local egress.”
        </p>
      </Section>
      <Section title="Agent Computer">
        <div className="settings-row">
          <div>
            <p className="muted">{computer.status}</p>
            <p className="muted">{computer.url}</p>
          </div>
          <span className={`pill ${computer.active ? "on" : ""}`}>{computer.active ? "Active" : "Idle"}</span>
        </div>
        <p className="muted">All Bots share one cloud computer. Files and sessions are not isolated per Bot.</p>
      </Section>
    </>
  );
}

function PluginsPane({
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
  const [tab, setTab] = useState<"marketplace" | "yours">("marketplace");
  return (
    <>
      <div className="tabs">
        <button className={tab === "marketplace" ? "on" : ""} onClick={() => setTab("marketplace")}>
          Marketplace
        </button>
        <button className={tab === "yours" ? "on" : ""} onClick={() => setTab("yours")}>
          Yours
        </button>
      </div>
      {tab === "marketplace" && (
        <>
          <p className="muted">Discover plugins and packaged skills. An installed plugin may still need authentication.</p>
          {plugins.map((p) => {
            const inst = installs.find((i) => i.pluginId === p.id);
            return (
              <div className="market-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.summary}</p>
                </div>
                {inst ? (
                  <label className="toggle">
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
        </>
      )}
      {tab === "yours" && (
        <>
          <p className="muted">Installed plugins and private skills on this account. Enable or disable individual tools.</p>
          {installs.length === 0 && <p className="muted">Nothing installed yet.</p>}
          {installs.map((inst) => {
            const p = plugins.find((x) => x.id === inst.pluginId);
            const tools = p?.tools?.length ? p.tools : inst.enabledTools;
            return (
              <div className="market-row yours-plugin" key={inst.pluginId}>
                <div>
                  <strong>{p?.name || inst.pluginId}</strong>
                  <p className="muted">{p?.summary}</p>
                  <div className="tool-toggles">
                    {tools.map((tool) => {
                      const on = inst.enabledTools.includes(tool) || inst.enabledTools.length === 0;
                      return (
                        <label key={tool} className="toggle">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...(inst.enabledTools.length ? inst.enabledTools : tools), tool]))
                                : (inst.enabledTools.length ? inst.enabledTools : tools).filter((t) => t !== tool);
                              void onTools(inst.pluginId, next, inst.connected);
                            }}
                          />
                          {tool}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <span className={`pill ${inst.connected ? "on" : ""}`}>{inst.connected ? "Connected" : "Needs auth"}</span>
              </div>
            );
          })}
          <h3>Packaged skills</h3>
          {BOT_TEMPLATES.map((t) => (
            <div className="market-row" key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <p>{t.description}</p>
              </div>
              <button onClick={() => void onTemplate(t.id)}>Add to Crew</button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function UsagePane({
  keys,
  onSaveKey,
  onRemoveKey,
}: {
  keys: { provider: string; last4: string }[];
  onSaveKey: (provider: string, secret: string) => Promise<void>;
  onRemoveKey: (provider: string) => Promise<void>;
}) {
  const connected = keys.filter((k) => isFreeLlmProvider(k.provider)).length;
  return (
    <>
      <Section title="Weekly usage">
        <div className="usage-meter">
          <div className="settings-row">
            <div>
              <strong>Included</strong>
              <p className="muted">Resets weekly on each connected provider.</p>
            </div>
            <span className="muted">{connected ? `${connected} provider${connected === 1 ? "" : "s"}` : "None"}</span>
          </div>
          <div className="bar" aria-hidden>
            <i style={{ width: connected ? "18%" : "0%" }} />
          </div>
        </div>
      </Section>
      <Section title="On-demand usage">
        <div className="settings-row">
          <div>
            <strong>Billed through your provider</strong>
            <p className="muted">Crew has no Crew-billed model usage. Extra tokens stay on the free-tier key you connected.</p>
          </div>
        </div>
      </Section>
      <Section title="On-demand monthly limit">
        <div className="settings-row">
          <div>
            <strong>Not enabled</strong>
            <p className="muted">There is no Crew spend cap. Limits live on Cerebras, Mistral, Gemini, Groq, or OpenRouter.</p>
          </div>
          <button disabled>Enable</button>
        </div>
      </Section>
      <Section title="Connected providers">
        <p className="muted">Free-tier providers only. Keys are encrypted and tested before they are saved.</p>
        <ProviderKeys keys={keys} onSaveKey={onSaveKey} onRemoveKey={onRemoveKey} />
      </Section>
    </>
  );
}

function ProviderKeys({
  keys,
  onSaveKey,
  onRemoveKey,
}: {
  keys: { provider: string; last4: string }[];
  onSaveKey: (provider: string, secret: string) => Promise<void>;
  onRemoveKey: (provider: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const connected = new Map(keys.filter((k) => isFreeLlmProvider(k.provider)).map((k) => [k.provider, k.last4]));

  return (
    <>
      {keyError && <div className="banner">{keyError}</div>}
      <div className="provider-list">
        {FREE_LLM_PROVIDERS.map((p) => {
          const isOn = connected.has(p.id);
          return (
            <div className="provider-row" key={p.id}>
              <div className="provider-head">
                <strong>{p.label}</strong>
                <span className={`pill ${isOn ? "on" : ""}`}>{isOn ? "Connected" : "Not connected"}</span>
              </div>
              <p className="muted">{p.keyHint}</p>
              <p className="muted">
                <a href={p.signupUrl} target="_blank" rel="noreferrer">
                  Get a free key
                </a>
                {" · "}
                {p.defaultModel}
              </p>
              {!isOn && (
                <div className="row">
                  <input
                    type="password"
                    placeholder={p.placeholder}
                    value={drafts[p.id] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  />
                  <button
                    disabled={busy === p.id || !(drafts[p.id] || "").trim()}
                    onClick={async () => {
                      setKeyError(null);
                      setBusy(p.id);
                      try {
                        await onSaveKey(p.id, drafts[p.id].trim());
                        setDrafts((d) => ({ ...d, [p.id]: "" }));
                      } catch (err) {
                        setKeyError((err as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {busy === p.id ? "Testing…" : "Connect"}
                  </button>
                </div>
              )}
              {isOn && (
                <div className="row">
                  <span className="muted">{connected.get(p.id)}</span>
                  <button
                    className="danger"
                    disabled={busy === p.id}
                    onClick={async () => {
                      setKeyError(null);
                      setBusy(p.id);
                      try {
                        await onRemoveKey(p.id);
                      } catch (err) {
                        setKeyError((err as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TeamSetupPane() {
  return (
    <Section title="Team Setup">
      <p>
        <strong>No managed setup</strong>
      </p>
      <p className="muted">
        Team Setup is Enterprise only. When an admin provides a managed setup, it appears here so you
        can review or reinstall it. Admins configure manifests from the dashboard.
      </p>
      <button disabled>Reinstall current setup</button>
    </Section>
  );
}

function BetaPane({
  onUpdateComputer,
  onResetComputer,
}: {
  onUpdateComputer: () => Promise<void>;
  onResetComputer: () => Promise<void>;
}) {
  const [checking, setChecking] = useState(false);
  const [appNote, setAppNote] = useState<string | null>(null);
  return (
    <>
      <Section title="Updates">
        <p className="muted">The Crew app and the Agent Computer update separately.</p>
        <div className="row">
          <button
            disabled={checking}
            onClick={() => {
              setChecking(true);
              window.setTimeout(() => {
                setChecking(false);
                setAppNote("You’re up to date.");
              }, 600);
            }}
          >
            {checking ? "Checking…" : "Check for Updates"}
          </button>
          <button disabled>Restart to Update</button>
          <button onClick={() => void onUpdateComputer()}>Update Agent Computer</button>
        </div>
        {appNote && <p className="muted">{appNote}</p>}
        <p className="muted">
          Check for Updates and Restart to Update update the desktop app. Update Agent Computer
          rebuilds the cloud computer on the latest image while preserving durable state.
        </p>
      </Section>
      <Section title="Reset">
        <p className="muted">
          Reset Agent Computer is a last resort that returns the computer to its synced durable
          state. Unsynced recent work does not come back.
        </p>
        <button className="danger" onClick={() => void onResetComputer()}>
          Reset Agent Computer
        </button>
      </Section>
    </>
  );
}
