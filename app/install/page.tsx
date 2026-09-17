import { InstallCrew } from "@/components/Pwa";

export default function InstallPage() {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" />
          Crew
        </div>
        <h1>Crew as a laptop app</h1>
        <p className="muted">Same product, own window — like a normal desktop app.</p>
        <InstallCrew variant="page" />
        <p className="muted" style={{ marginTop: 16 }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
