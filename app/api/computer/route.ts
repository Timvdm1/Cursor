import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { computerSnapshot, navigate, act, setTakeover, runSandbox } from "@/lib/computer";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await computerSnapshot());
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    action:
      | "navigate"
      | "click"
      | "type"
      | "scroll"
      | "takeover"
      | "release"
      | "sandbox"
      | "localExecution"
      | "localEgress"
      | "resetComputer"
      | "updateComputer";
    url?: string;
    value?: string;
    localExecution?: "ask" | "always" | "never";
    localEgress?: boolean;
  };
  if (body.action === "navigate" && body.url) return NextResponse.json(await navigate(body.url));
  if (body.action === "click" || body.action === "type" || body.action === "scroll") {
    return NextResponse.json(await act(body.action, body.value));
  }
  if (body.action === "takeover") return NextResponse.json(await setTakeover(true));
  if (body.action === "release") return NextResponse.json(await setTakeover(false));
  if (body.action === "sandbox") {
    const out = await runSandbox(body.value || "pwd");
    await mutate((s) => {
      s.computer.logs = [`$ ${body.value}`, out.output, ...s.computer.logs].slice(0, 40);
      return null;
    });
    return NextResponse.json(out);
  }
  if (body.action === "localExecution" && body.localExecution) {
    const computer = await mutate((s) => {
      s.computer.localExecution = body.localExecution!;
      return s.computer;
    });
    return NextResponse.json(computer);
  }
  if (body.action === "localEgress" && typeof body.localEgress === "boolean") {
    const computer = await mutate((s) => {
      s.computer.localEgress = body.localEgress!;
      return s.computer;
    });
    return NextResponse.json(computer);
  }
  if (body.action === "resetComputer") {
    const computer = await mutate((s) => {
      s.computer.active = false;
      s.computer.takeover = false;
      s.computer.status = "Reset to durable snapshot";
      s.computer.logs = ["Reset Agent Computer", ...s.computer.logs].slice(0, 40);
      s.computer.url = "crew://desktop";
      s.computer.title = "Agent Computer";
      return s.computer;
    });
    return NextResponse.json(computer);
  }
  if (body.action === "updateComputer") {
    const computer = await mutate((s) => {
      s.computer.status = "Updated Agent Computer image";
      s.computer.logs = ["Update Agent Computer", ...s.computer.logs].slice(0, 40);
      return s.computer;
    });
    return NextResponse.json(computer);
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
