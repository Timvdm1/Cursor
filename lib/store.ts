import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { CrewState } from "./types";
import { emptyState, seedState } from "./seed";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "crew.json");
const KV_KEY = "crew-state";

let writeQueue: Promise<void> = Promise.resolve();

type Kv = { get: (key: string) => Promise<string | null>; put: (key: string, value: string) => Promise<void> };

async function cloudflareKv(): Promise<Kv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as { CREW?: Kv } | undefined)?.CREW;
    return kv ?? null;
  } catch {
    return null;
  }
}

function normalize(state: CrewState): CrewState {
  if (!state.computer.localExecution) state.computer.localExecution = "ask";
  if (typeof state.computer.localEgress !== "boolean") state.computer.localEgress = false;
  if (state.computer.title === "Crew Computer") state.computer.title = "Agent Computer";
  return state;
}

export async function loadState(): Promise<CrewState> {
  const kv = await cloudflareKv();
  if (kv) {
    const raw = await kv.get(KV_KEY);
    if (raw) return normalize(JSON.parse(raw) as CrewState);
    const seeded = seedState();
    await kv.put(KV_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as CrewState);
  } catch {
    const seeded = seedState();
    await persistFs(seeded);
    return seeded;
  }
}

export async function mutate<T>(fn: (state: CrewState) => T | Promise<T>): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const state = await loadState();
    result = await fn(state);
    await persist(state);
  });
  await writeQueue;
  return result;
}

async function persist(state: CrewState): Promise<void> {
  const kv = await cloudflareKv();
  const payload = JSON.stringify(state);
  if (kv) {
    await kv.put(KV_KEY, payload);
    return;
  }
  await persistFs(state);
}

async function persistFs(state: CrewState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

export async function resetDemo(): Promise<CrewState> {
  const seeded = seedState();
  await persist(seeded);
  return seeded;
}

export function snapshotEmpty(): CrewState {
  return emptyState();
}
