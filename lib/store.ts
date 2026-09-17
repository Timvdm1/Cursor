import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { CrewState } from "./types";
import { emptyState, seedState } from "./seed";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "crew.json");

let writeQueue: Promise<void> = Promise.resolve();

export async function loadState(): Promise<CrewState> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as CrewState;
  } catch {
    const seeded = seedState();
    await persist(seeded);
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
