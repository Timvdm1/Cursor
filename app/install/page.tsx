import { InstallCrew } from "@/components/Pwa";

export default function InstallPage() {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" />
          Crew
        </div>
        <h1>Crew als laptop-app</h1>
        <p className="muted">Zelfde product, eigen venster — zoals een normale desktop-app.</p>
        <InstallCrew variant="page" />
        <p className="muted" style={{ marginTop: 16 }}>
          <a href="/login">Terug naar login</a>
        </p>
      </div>
    </div>
  );
}
