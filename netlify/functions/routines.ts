type NetlifyConfig = { schedule?: string };

async function handler() {
  const { loadState, mutate } = await import("../../lib/store");
  const { MAX_ROUTINE_LOGS } = await import("../../lib/types");
  const state = await loadState();
  const now = Date.now();
  const due = state.routines.filter((r) => !r.paused && new Date(r.nextRunAt).getTime() <= now);
  await mutate((s) => {
    for (const r of due) {
      s.routineRuns.unshift({
        id: "run_" + Math.random().toString(36).slice(2, 8),
        routineId: r.id,
        status: "success",
        log: `Scheduled run: ${r.name}`,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      });
      s.routineRuns = s.routineRuns.slice(0, MAX_ROUTINE_LOGS * 4);
      r.nextRunAt = new Date(now + 24 * 3600_000).toISOString();
    }
  });
  return Response.json({ ran: due.length });
}

export default handler;

export const config: NetlifyConfig = {
  schedule: "*/15 * * * *",
};
