"use client";

import { useEffect, useState } from "react";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);
  return null;
}

export function InstallCrew({ variant = "banner" }: { variant?: "banner" | "settings" | "page" }) {
  const [deferred, setDeferred] = useState<BeforeInstall | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstall);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) {
      if (variant !== "page") {
        window.location.href = "/install";
        return;
      }
      setHint("Gebruik Chrome of Edge: icoon in de adresbalk → Install Crew.");
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setStandalone(true);
    setDeferred(null);
  }

  if (standalone) {
    return (
      <div className={`install-card ${variant}`} data-testid="crew-installed">
        <strong>Crew draait als app</strong>
        <p className="muted">Eigen venster, zonder browser-tab. Je vindt ‘m bij je andere apps.</p>
      </div>
    );
  }

  return (
    <div className={`install-card ${variant}`}>
      <strong>Zet Crew op je laptop</strong>
      <p className="muted">Installeer als app: eigen icoon, eigen venster, geen adresbalk.</p>
      <div className="row">
        <button className="send install-btn" type="button" onClick={() => void install()}>
          {deferred ? "Installeren" : "Hoe installeer ik dit?"}
        </button>
        {variant !== "page" && (
          <a className="ghost" href="/install">
            Stappen
          </a>
        )}
      </div>
      {hint && <p className="muted">{hint}</p>}
      {variant === "page" && (
        <ol className="install-steps">
          <li>
            <strong>Chrome of Edge (Windows / ChromeOS / Linux)</strong> — klik op het icoon in de adresbalk of op
            Installeren hierboven. Crew komt in het Start-menu / je apps.
          </li>
          <li>
            <strong>Chrome op Mac</strong> — klik ⋮ → <em>Cast, save, and share</em> → <em>Install Crew…</em>. Daarna
            staat Crew in Programma’s.
          </li>
          <li>
            <strong>Safari op Mac</strong> — Bestand → <em>Zet in Dock</em> (of Deel → Zet in Dock).
          </li>
          <li>
            <strong>Lokaal draaien</strong> — in deze repo: <code>npm run dev</code> en daarna{" "}
            <code>npm run desktop</code> opent Crew meteen als app-venster.
          </li>
        </ol>
      )}
    </div>
  );
}
