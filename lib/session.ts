import { cookies } from "next/headers";
import { loadState } from "./store";

export const SESSION_COOKIE = "crew_session";

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const state = await loadState();
  if (!state.user || token !== state.user.id) return null;
  return state.user;
}
