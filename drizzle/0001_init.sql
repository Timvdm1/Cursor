-- Netlify Database (Postgres) target schema. Local/dev uses `.data/crew.json`.

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  appearance text NOT NULL DEFAULT 'dark',
  timezone text NOT NULL DEFAULT 'Europe/Amsterdam'
);

CREATE TABLE IF NOT EXISTS bots (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  color text NOT NULL,
  shape text NOT NULL,
  memory text NOT NULL DEFAULT '',
  system_prompt text NOT NULL,
  model text NOT NULL DEFAULT 'auto',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  kind text NOT NULL,
  title text NOT NULL,
  bot_ids jsonb NOT NULL,
  last_preview text NOT NULL,
  attention text NOT NULL DEFAULT 'none',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL,
  role text NOT NULL,
  sender_bot_id text,
  kind text NOT NULL,
  content text NOT NULL,
  card jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  provider text PRIMARY KEY,
  ciphertext text NOT NULL,
  last4 text NOT NULL
);

CREATE TABLE IF NOT EXISTS routines (
  id text PRIMARY KEY,
  bot_id text NOT NULL,
  name text NOT NULL,
  instructions text NOT NULL,
  schedule text NOT NULL,
  paused boolean NOT NULL DEFAULT false
);
