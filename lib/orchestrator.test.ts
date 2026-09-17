import { describe, expect, it } from "vitest";
import { applySkill, pickResponders } from "./orchestrator";
import { seedState } from "./seed";

describe("orchestrator", () => {
  it("picks @mentioned bots", () => {
    const state = seedState();
    const bots = state.bots;
    const hits = pickResponders("hey @Research kijk hier", bots, bots.map((b) => b.id));
    expect(hits.some((b) => b.name === "Research")).toBe(true);
  });

  it("expands slash skills", () => {
    const state = seedState();
    const out = applySkill("/morning-briefing status", state);
    expect(out.skillName).toBe("Morning briefing");
    expect(out.text).toContain("Geen externe mails");
  });
});
