import type { Attention, BotStatus } from "./types";

export function cycleStatus(current: BotStatus, event: "task" | "run" | "pause" | "block" | "finish" | "reset"): BotStatus {
  if (event === "reset") return "idle";
  if (event === "block") return "blocked";
  if (event === "finish") return "done";
  if (event === "pause") return "waiting";
  if (event === "task") return current === "idle" || current === "done" ? "thinking" : current;
  if (event === "run") return "working";
  return current;
}

/** Roster/chat presence: live motion first, then working, then attention badges. */
export function presenceStatus(opts: {
  live?: BotStatus;
  workingBotId?: string;
  botId?: string;
  attention: Attention;
}): BotStatus {
  if (opts.live) return opts.live;
  if (opts.workingBotId && (!opts.botId || opts.workingBotId === opts.botId)) return "working";
  if (opts.attention === "needs") return "blocked";
  if (opts.attention === "unread") return "waiting";
  return "idle";
}

export function statusLabel(status: BotStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "thinking":
      return "Thinking";
    case "working":
      return "Working";
    case "waiting":
      return "Unread";
    case "blocked":
      return "Needs attention";
    case "done":
      return "Done";
    default:
      return status;
  }
}
