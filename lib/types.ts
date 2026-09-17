export type BotStatus = "idle" | "thinking" | "working" | "waiting" | "blocked" | "done";
export type AvatarShape = "stadium" | "squircle" | "capsule" | "diamond" | "hex" | "pill";
export type Attention = "none" | "unread" | "needs";
export type ConversationKind = "dm" | "group";
export type MessageKind = "text" | "event" | "card" | "approval" | "handoff" | "trace";
export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "openrouter"
  | "browserbase"
  | "e2b"
  | "gateway";

export const AVATAR_COLORS = [
  "#2EE6A6",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#A78BFA",
  "#EC4899",
  "#14B8A6",
  "#F97316",
] as const;

export const AVATAR_SHAPES: AvatarShape[] = [
  "stadium",
  "squircle",
  "capsule",
  "diamond",
  "hex",
  "pill",
];

export type Bot = {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  shape: AvatarShape;
  memory: string;
  systemPrompt: string;
  model: string;
  createdAt: string;
  hidden: boolean;
  notifications: boolean;
};

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  botIds: string[];
  lastMessageAt: string;
  lastPreview: string;
  attention: Attention;
  workingBotId?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  senderBotId?: string;
  kind: MessageKind;
  content: string;
  createdAt: string;
  replyToId?: string;
  reactions?: Record<string, number>;
  card?: Record<string, unknown>;
  hiddenFromModel?: boolean;
};

export type Handoff = {
  id: string;
  conversationId: string;
  fromBotId: string;
  toBotId: string;
  body: string;
  status: "queued" | "running" | "done" | "blocked";
  hopCount: number;
  createdAt: string;
};

export type Skill = {
  id: string;
  name: string;
  slug: string;
  whenToUse: string;
  instructions: string;
  requiresApproval: boolean;
  enabledBotIds: string[];
};

export type Routine = {
  id: string;
  botId: string;
  name: string;
  instructions: string;
  schedule: string;
  timezone: string;
  paused: boolean;
  approvalBoundary: string;
  nextRunAt: string;
  createdAt: string;
};

export type RoutineRun = {
  id: string;
  routineId: string;
  status: "success" | "failed" | "running";
  log: string;
  startedAt: string;
  finishedAt?: string;
};

export type Approval = {
  id: string;
  conversationId: string;
  messageId: string;
  action: string;
  payload: Record<string, unknown>;
  status: "pending" | "allowed" | "denied" | "always";
};

export type AutoReviewRule = {
  id: string;
  pattern: string;
  mode: "ask_first" | "allow";
};

export type Plugin = {
  id: string;
  name: string;
  summary: string;
  category: string;
  tools: string[];
  mcpUrl?: string;
};

export type PluginInstall = {
  pluginId: string;
  enabledTools: string[];
  connected: boolean;
};

export type ApiKey = {
  provider: ProviderId;
  ciphertext: string;
  last4: string;
};

export type WorkspaceFile = {
  path: string;
  content: string;
  updatedAt: string;
};

export type ComputerState = {
  active: boolean;
  url: string;
  title: string;
  status: string;
  cursor: { x: number; y: number };
  logs: string[];
  takeover: boolean;
  wallpaperHour: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  appearance: "system" | "light" | "dark";
  timezone: string;
};

export type CrewState = {
  user: User | null;
  bots: Bot[];
  conversations: Conversation[];
  messages: Message[];
  handoffs: Handoff[];
  skills: Skill[];
  routines: Routine[];
  routineRuns: RoutineRun[];
  approvals: Approval[];
  autoReviewRules: AutoReviewRule[];
  plugins: Plugin[];
  installs: PluginInstall[];
  keys: ApiKey[];
  files: WorkspaceFile[];
  computer: ComputerState;
  memories: { botId: string; note: string; updatedAt: string }[];
};

export const MAX_BOTS = 50;
export const MAX_GROUP = 6;
export const MAX_HANDOFF_HOPS = 8;
export const MAX_ROUTINES_PER_BOT = 50;
export const MAX_ROUTINE_LOGS = 20;
