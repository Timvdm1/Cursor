"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InstallCrew } from "@/components/Pwa";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@crew.app");
  const [password, setPassword] = useState("crew");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, mode }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Sign in failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" />
          Crew
        </div>
        <h1>Sign in</h1>
        <p className="muted">Bots with names, memory, and a shared computer. Demo: demo@crew.app / crew</p>
        <form onSubmit={submit}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          {error && <div className="banner">{error}</div>}
          <button className="send" type="submit" style={{ width: "100%", height: 44 }}>
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          <button className="ghost" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create account" : "I already have an account"}
          </button>
        </p>
        <InstallCrew variant="banner" />
      </div>
    </div>
  );
}
