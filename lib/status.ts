import type { BotStatus } from "./types";

export function cycleStatus(current: BotStatus, event: "task" | "run" | "pause" | "block" | "finish" | "reset"): BotStatus {
  if (event === "reset") return "idle";
  if (event === "block") return "blocked";
  if (event === "finish") return "done";
  if (event === "pause") return "waiting";
  if (event === "task") return current === "idle" || current === "done" ? "thinking" : current;
  if (event === "run") return "working";
  return current;
}

export function statusLabel(status: BotStatus): string {
  switch (status) {
    case "idle":
      return "Rustig";
    case "thinking":
      return "Denkt na";
    case "working":
      return "Aan het werk";
    case "waiting":
      return "Wacht";
    case "blocked":
      return "Hulp nodig";
    case "done":
      return "Klaar";
    default:
      return status;
  }
}
