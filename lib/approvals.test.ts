import { describe, expect, it } from "vitest";
import { decideReview } from "./approvals";

describe("auto-review", () => {
  const rules = [
    { id: "1", pattern: "send|email", mode: "ask_first" as const },
    { id: "2", pattern: "web_search", mode: "allow" as const },
    { id: "3", pattern: "send_email", mode: "allow" as const },
  ];

  it("ask_first wins over allow", () => {
    expect(decideReview("send_email", rules)).toBe("ask_first");
  });

  it("allows matching allow rules", () => {
    expect(decideReview("web_search", rules)).toBe("allow");
  });

  it("defaults risky verbs to ask_first", () => {
    expect(decideReview("publish_blog", [])).toBe("ask_first");
  });
});
