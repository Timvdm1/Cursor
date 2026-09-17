import type { AutoReviewRule } from "./types";

export function decideReview(
  action: string,
  rules: AutoReviewRule[],
): "ask_first" | "allow" {
  const matches = rules.filter((r) => {
    const p = r.pattern.toLowerCase();
    return action.toLowerCase().includes(p) || new RegExp(p, "i").test(action);
  });
  if (matches.some((m) => m.mode === "ask_first")) return "ask_first";
  if (matches.some((m) => m.mode === "allow")) return "allow";
  if (/send|publish|purchase|delete|production|email|pay/i.test(action)) return "ask_first";
  return "allow";
}
