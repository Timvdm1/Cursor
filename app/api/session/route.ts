import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadState, mutate } from "@/lib/store";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const state = await loadState();
  if (!state.user || token !== state.user.id) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { id: state.user.id, email: state.user.email, name: state.user.name, appearance: state.user.appearance },
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string; name?: string; mode?: string };
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return NextResponse.json({ error: "Email en wachtwoord verplicht" }, { status: 400 });

  const user = await mutate((state) => {
    if (body.mode === "register") {
      if (state.user && state.user.email !== email) {
        /* keep demo user; additional accounts collapse to one local profile */
      }
      state.user = {
        id: "user_" + email.replace(/[^a-z0-9]/g, "").slice(0, 12),
        email,
        name: body.name || email.split("@")[0],
        passwordHash: hashPassword(password),
        appearance: "dark",
        timezone: "Europe/Amsterdam",
      };
      return state.user;
    }
    if (!state.user) return null;
    if (state.user.email !== email || !verifyPassword(password, state.user.passwordHash)) return null;
    return state.user;
  });

  if (!user) return NextResponse.json({ error: "Onjuiste login. Probeer demo@crew.app / crew" }, { status: 401 });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
