import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const files = await mutate((s) => s.files);
  return NextResponse.json({ files });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { path: string; content: string };
  if (!body.path?.startsWith("/workspace")) {
    return NextResponse.json({ error: "Only /workspace paths are allowed" }, { status: 400 });
  }
  const file = await mutate((state) => {
    const existing = state.files.find((f) => f.path === body.path);
    if (existing) {
      existing.content = body.content;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const created = { path: body.path, content: body.content, updatedAt: new Date().toISOString() };
    state.files.push(created);
    return created;
  });
  return NextResponse.json({ file });
}
