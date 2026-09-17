"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setError(json.error || "Login mislukt");
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
        <h1>Je team, altijd aan.</h1>
        <p className="muted">Bots met namen, geheugen en een gedeelde computer. Demo: demo@crew.app / crew</p>
        <form onSubmit={submit}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Wachtwoord" />
          {error && <div className="banner">{error}</div>}
          <button className="send" type="submit" style={{ width: "100%", height: 44 }}>
            {mode === "login" ? "Binnen" : "Account maken"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          <button className="ghost" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Nieuw account" : "Ik heb al een account"}
          </button>
        </p>
      </div>
    </div>
  );
}
