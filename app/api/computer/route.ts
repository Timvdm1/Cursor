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
    action: "navigate" | "click" | "type" | "scroll" | "takeover" | "release" | "sandbox";
    url?: string;
    value?: string;
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
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
