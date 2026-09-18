import { loadState } from "@/lib/store";
import { Avatar } from "@/components/Avatar";

export default async function SharePage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const state = await loadState();
  const bot = state.bots.find((b) => b.id === botId);
  if (!bot) return <main style={{ padding: 40 }}>Bot niet gevonden.</main>;
  return (
    <main className="auth">
      <div className="auth-card">
        <Avatar color={bot.color} shape={bot.shape} size={56} />
        <h1>{bot.name}</h1>
        <p>{bot.title}</p>
        <p className="muted">{bot.description}</p>
        <p className="muted">Dit is een kopie van instructies en skills. Computer, logins en geschiedenis gaan niet mee.</p>
      </div>
    </main>
  );
}
