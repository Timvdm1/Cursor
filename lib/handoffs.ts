import { MAX_HANDOFF_HOPS } from "./types";

export function nextHopCount(prev: number): number {
  return prev + 1;
}

export function canHandoff(hopCount: number): boolean {
  return hopCount < MAX_HANDOFF_HOPS;
}

export function debounceKey(fromBotId: string, toBotId: string, body: string): string {
  return `${fromBotId}->${toBotId}:${body.trim().slice(0, 80)}`;
}

const recent = new Map<string, number>();

export function shouldDebounce(key: string, windowMs = 8000, now = Date.now()): boolean {
  const last = recent.get(key);
  if (last && now - last < windowMs) return true;
  recent.set(key, now);
  return false;
}

export function resetDebounce(): void {
  recent.clear();
}
