import { loadState, mutate } from "./store";
import type { ComputerState } from "./types";

const SENSITIVE_HOST_HINT = /login|signin|captcha|checkout|pay/i;

export async function computerSnapshot(): Promise<ComputerState> {
  const state = await loadState();
  return state.computer;
}

export async function navigate(url: string) {
  return mutate((state) => {
    state.computer.active = true;
    state.computer.url = url;
    state.computer.title = url.replace(/^https?:\/\//, "").slice(0, 48);
    state.computer.status = "Navigating";
    state.computer.cursor = { x: 120 + Math.random() * 40, y: 90 + Math.random() * 30 };
    state.computer.logs = [`open ${url}`, ...state.computer.logs].slice(0, 40);
    if (SENSITIVE_HOST_HINT.test(url)) {
      state.computer.takeover = true;
      state.computer.status = "Takeover — gevoelige stap";
    }
    return { ...state.computer };
  });
}

export async function act(kind: "click" | "type" | "scroll", value?: string) {
  return mutate((state) => {
    state.computer.active = true;
    state.computer.cursor = {
      x: Math.min(92, Math.max(8, state.computer.cursor.x + (Math.random() * 24 - 8))),
      y: Math.min(88, Math.max(12, state.computer.cursor.y + (Math.random() * 18 - 6))),
    };
    const line = kind === "type" ? `type ${value ?? ""}` : kind;
    state.computer.logs = [line, ...state.computer.logs].slice(0, 40);
    state.computer.status = kind === "type" ? "Typing" : "Working";
    return { ...state.computer };
  });
}

export async function setTakeover(on: boolean) {
  return mutate((state) => {
    state.computer.takeover = on;
    state.computer.status = on ? "Jij bestuurt" : "Bot hervat";
    if (!on) state.computer.active = true;
    return { ...state.computer };
  });
}

export async function runSandbox(command: string): Promise<{ ok: boolean; output: string }> {
  const allow = /^(ls|pwd|cat |head |wc |echo |date|uname)/.test(command.trim());
  if (!allow) {
    return {
      ok: false,
      output: "Geblokkeerd. Alleen read-only sandbox-commando's (ls, pwd, cat, echo, date).",
    };
  }
  if (command.startsWith("cat ")) {
    const filePath = command.slice(4).trim();
    const state = await loadState();
    const file = state.files.find((f) => f.path === filePath || f.path.endsWith(filePath));
    return { ok: true, output: file?.content ?? `cat: ${filePath}: geen bestand in /workspace` };
  }
  if (command.trim() === "ls" || command.trim() === "ls /workspace") {
    const state = await loadState();
    return { ok: true, output: state.files.map((f) => f.path).join("\n") || "(leeg)" };
  }
  if (command.trim() === "pwd") return { ok: true, output: "/workspace" };
  if (command.trim() === "date") return { ok: true, output: new Date().toISOString() };
  if (command.startsWith("echo ")) return { ok: true, output: command.slice(5) };
  return { ok: true, output: "(sandbox) ok" };
}
