import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { MAX_ROUTINE_LOGS, MAX_ROUTINES_PER_BOT } from "@/lib/types";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await mutate((s) => ({ skills: s.skills, routines: s.routines, runs: s.routineRuns }));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    type: "skill" | "routine" | "pause" | "run";
    name?: string;
    slug?: string;
    instructions?: string;
    botId?: string;
    id?: string;
    paused?: boolean;
  };

  if (body.type === "skill") {
    const skill = await mutate((state) => {
      const created = {
        id: "skill_" + Math.random().toString(36).slice(2, 8),
        name: body.name || "Skill",
        slug: (body.slug || body.name || "skill").toLowerCase().replace(/\s+/g, "-"),
        whenToUse: "Op verzoek",
        instructions: body.instructions || "",
        requiresApproval: false,
        enabledBotIds: state.bots.map((b) => b.id),
      };
      state.skills.push(created);
      return created;
    });
    return NextResponse.json({ skill });
  }

  if (body.type === "routine") {
    const rtn = await mutate((state) => {
      const botId = body.botId || state.bots[0]?.id;
      if (!botId) throw new Error("no bot");
      if (state.routines.filter((r) => r.botId === botId).length >= MAX_ROUTINES_PER_BOT) {
        throw new Error("max");
      }
      const created = {
        id: "rtn_" + Math.random().toString(36).slice(2, 8),
        botId,
        name: body.name || "Routine",
        instructions: body.instructions || "",
        schedule: "0 8 * * 1-5",
        timezone: state.user?.timezone || "Europe/Amsterdam",
        paused: false,
        approvalBoundary: "Geen externe sends",
        nextRunAt: new Date(Date.now() + 3600_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      state.routines.push(created);
      return created;
    }).catch((e: Error) => e.message);
    if (typeof rtn === "string") return NextResponse.json({ error: rtn }, { status: 400 });
    return NextResponse.json({ routine: rtn });
  }

  if (body.type === "pause" && body.id) {
    await mutate((state) => {
      const r = state.routines.find((x) => x.id === body.id);
      if (r) r.paused = Boolean(body.paused);
    });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "run" && body.id) {
    const run = await mutate((state) => {
      const r = state.routines.find((x) => x.id === body.id);
      if (!r) return null;
      const created = {
        id: "run_" + Math.random().toString(36).slice(2, 8),
        routineId: r.id,
        status: "success" as const,
        log: `Test run van ${r.name}: ${r.instructions}`,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      };
      state.routineRuns = [created, ...state.routineRuns.filter((x) => x.routineId === r.id)].slice(0, MAX_ROUTINE_LOGS).concat(
        state.routineRuns.filter((x) => x.routineId !== r.id),
      );
      return created;
    });
    return NextResponse.json({ run });
  }

  return NextResponse.json({ error: "unknown" }, { status: 400 });
}
