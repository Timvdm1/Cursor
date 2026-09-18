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
      setHint("Use Chrome or Edge: the icon in the address bar → Install Crew.");
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
        <strong>{variant === "settings" ? "Installed on this device" : "Crew is running as an app"}</strong>
        <p className="muted">
          {variant === "settings"
            ? "The iOS, Android, and laptop apps share this account."
            : "Own window, no browser tab. You’ll find it with your other apps."}
        </p>
      </div>
    );
  }

  return (
    <div className={`install-card ${variant}`}>
      <strong>{variant === "settings" ? "Get the iOS or Android app" : "Put Crew on your laptop"}</strong>
      <p className="muted">
        {variant === "settings"
          ? "Install Crew on this laptop or open the mobile app with the same account."
          : "Install as an app: own icon, own window, no address bar."}
      </p>
      <div className="row">
        <button className="send install-btn" type="button" onClick={() => void install()}>
          {deferred ? "Install Crew" : "How do I install this?"}
        </button>
        {variant !== "page" && (
          <a className="ghost" href="/install">
            Steps
          </a>
        )}
      </div>
      {hint && <p className="muted">{hint}</p>}
      {variant === "page" && (
        <ol className="install-steps">
          <li>
            <strong>Chrome or Edge (Windows / ChromeOS / Linux)</strong> — click the icon in the address bar or
            Install Crew above. Crew lands in the Start menu / your apps.
          </li>
          <li>
            <strong>Chrome on Mac</strong> — click ⋮ → <em>Cast, save, and share</em> → <em>Install Crew…</em>. Then
            Crew is in Applications.
          </li>
          <li>
            <strong>Safari on Mac</strong> — File → <em>Add to Dock</em> (or Share → Add to Dock).
          </li>
          <li>
            <strong>Run locally</strong> — in this repo: <code>npm run dev</code> then{" "}
            <code>npm run desktop</code> opens Crew as an app window.
          </li>
        </ol>
      )}
    </div>
  );
}
