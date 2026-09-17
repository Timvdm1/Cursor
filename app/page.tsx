import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { loadState } from "@/lib/store";
import { maskKey } from "@/lib/crypto";
import { AppShell } from "@/components/AppShell";

export default async function HomePage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const state = await loadState();
  if (!state.user || token !== state.user.id) redirect("/login");

  return (
    <AppShell
      initial={{
        user: {
          id: state.user.id,
          email: state.user.email,
          name: state.user.name,
          appearance: state.user.appearance,
          timezone: state.user.timezone,
        },
        bots: state.bots.filter((b) => !b.hidden),
        conversations: state.conversations,
        messages: state.messages,
        skills: state.skills,
        routines: state.routines,
        approvals: state.approvals,
        autoReviewRules: state.autoReviewRules,
        plugins: state.plugins,
        installs: state.installs,
        files: state.files,
        computer: state.computer,
        keys: state.keys.map((k) => ({ provider: k.provider, last4: maskKey(k.last4) })),
      }}
    />
  );
}
