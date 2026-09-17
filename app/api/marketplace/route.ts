import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { mutate } from "@/lib/store";
import { PLUGIN_CATALOG, BOT_TEMPLATES } from "@/lib/catalog";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await mutate((s) => ({
    plugins: PLUGIN_CATALOG,
    installs: s.installs,
    bots: BOT_TEMPLATES,
  }));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    pluginId?: string;
    templateId?: string;
    mcpUrl?: string;
    enabledTools?: string[];
    connected?: boolean;
  };

  if (body.templateId) {
    const t = BOT_TEMPLATES.find((x) => x.id === body.templateId);
    if (!t) return NextResponse.json({ error: "unknown template" }, { status: 404 });
    const bot = await mutate((state) => {
      const id = "bot_" + t.id + Math.random().toString(36).slice(2, 5);
      const created = {
        id,
        name: t.name,
        title: t.title,
        description: t.description,
        color: t.color,
        shape: t.shape,
        memory: "",
        systemPrompt: t.systemPrompt,
        model: "auto",
        createdAt: new Date().toISOString(),
        hidden: false,
        notifications: true,
      };
      state.bots.push(created);
      state.conversations.unshift({
        id: "convo_" + id,
        kind: "dm",
        title: t.name,
        botIds: [id],
        lastMessageAt: new Date().toISOString(),
        lastPreview: "Template geïnstalleerd",
        attention: "unread",
      });
      return created;
    });
    return NextResponse.json({ bot });
  }

  if (!body.pluginId) return NextResponse.json({ error: "pluginId" }, { status: 400 });
  const plugin = PLUGIN_CATALOG.find((p) => p.id === body.pluginId);
  if (!plugin) return NextResponse.json({ error: "unknown plugin" }, { status: 404 });

  const install = await mutate((state) => {
    let row = state.installs.find((i) => i.pluginId === body.pluginId);
    if (!row) {
      row = { pluginId: plugin.id, enabledTools: plugin.tools, connected: true };
      state.installs.push(row);
    }
    if (body.enabledTools) row.enabledTools = body.enabledTools;
    if (typeof body.connected === "boolean") row.connected = body.connected;
    if (body.mcpUrl) plugin.mcpUrl = body.mcpUrl;
    return row;
  });
  return NextResponse.json({ install });
}
