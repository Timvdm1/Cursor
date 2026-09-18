import { describe, expect, it } from "vitest";
import { canHandoff, debounceKey, nextHopCount, resetDebounce, shouldDebounce } from "./handoffs";
import { MAX_HANDOFF_HOPS } from "./types";

describe("handoffs", () => {
  it("allows hops below the limit", () => {
    expect(canHandoff(0)).toBe(true);
    expect(canHandoff(MAX_HANDOFF_HOPS - 1)).toBe(true);
    expect(canHandoff(MAX_HANDOFF_HOPS)).toBe(false);
  });

  it("increments hop count", () => {
    expect(nextHopCount(3)).toBe(4);
  });

  it("debounces duplicate handoffs", () => {
    resetDebounce();
    const key = debounceKey("a", "b", "doe dit");
    expect(shouldDebounce(key, 8000, 1000)).toBe(false);
    expect(shouldDebounce(key, 8000, 2000)).toBe(true);
    expect(shouldDebounce(key, 8000, 10_000)).toBe(false);
  });
});
