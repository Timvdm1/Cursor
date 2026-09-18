import { describe, expect, it } from "vitest";
import { cycleStatus, presenceStatus, statusLabel } from "./status";

describe("cycleStatus", () => {
  it("acknowledges a task by thinking, then kicks into gear", () => {
    expect(cycleStatus("idle", "task")).toBe("thinking");
    expect(cycleStatus("thinking", "run")).toBe("working");
    expect(cycleStatus("working", "finish")).toBe("done");
    expect(cycleStatus("done", "reset")).toBe("idle");
  });

  it("signals waiting and blocked as distinct motions", () => {
    expect(cycleStatus("working", "pause")).toBe("waiting");
    expect(cycleStatus("working", "block")).toBe("blocked");
  });
});

describe("presenceStatus", () => {
  it("prefers live motion over stored attention", () => {
    expect(
      presenceStatus({ live: "thinking", workingBotId: "bot_a", botId: "bot_a", attention: "unread" }),
    ).toBe("thinking");
  });

  it("shows working when a bot is mid-turn", () => {
    expect(presenceStatus({ workingBotId: "bot_a", botId: "bot_a", attention: "none" })).toBe("working");
    expect(presenceStatus({ workingBotId: "bot_a", attention: "none" })).toBe("working");
    expect(presenceStatus({ workingBotId: "bot_a", botId: "bot_b", attention: "none" })).toBe("idle");
  });

  it("maps attention to waiting or blocked", () => {
    expect(presenceStatus({ attention: "unread" })).toBe("waiting");
    expect(presenceStatus({ attention: "needs" })).toBe("blocked");
    expect(presenceStatus({ attention: "none" })).toBe("idle");
  });
});

describe("statusLabel", () => {
  it("names every lifecycle state", () => {
    expect(statusLabel("idle")).toBe("Idle");
    expect(statusLabel("thinking")).toBe("Thinking");
    expect(statusLabel("working")).toBe("Working");
    expect(statusLabel("waiting")).toBe("Unread");
    expect(statusLabel("blocked")).toBe("Needs attention");
    expect(statusLabel("done")).toBe("Done");
  });
});
