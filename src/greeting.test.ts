import { describe, expect, it } from "vitest";
import { greet } from "./greeting";

describe("greet", () => {
  it("greets a provided name", () => {
    expect(greet("Tim")).toBe("Hello, Tim!");
  });

  it("trims surrounding whitespace", () => {
    expect(greet("  Ada  ")).toBe("Hello, Ada!");
  });

  it("falls back to 'world' when empty", () => {
    expect(greet("")).toBe("Hello, world!");
    expect(greet("   ")).toBe("Hello, world!");
  });
});
