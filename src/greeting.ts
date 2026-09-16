/**
 * Pure helper kept separate from the UI so it can be unit-tested in isolation.
 * Returns a friendly greeting for the given name, falling back to "world".
 */
export function greet(name: string): string {
  const trimmed = name.trim();
  return `Hello, ${trimmed.length > 0 ? trimmed : "world"}!`;
}
