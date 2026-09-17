# Crew

Teammate-platform in de stijl van Grok Bot: **roster-first** bots, groepschat, handoffs, marketplace, BYOK-keys en een gedeelde computer-preview. Eigen merk (Crew), teal accent, geen xAI-assets.

## Lokaal

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Demo-login: `demo@crew.app` / `crew`.

```bash
npm test
npm run typecheck
npm run build
```

## Wat erin zit

- Persistente bots (max 50), groepen (2–6), `@` mentions, `/` skills
- Bot-naar-bot handoffs (max 8 hops, debounce)
- Approvals + auto-review (Ask first wint)
- Marketplace: plugins + bot-templates
- Versleutelde API keys (AES-GCM)
- Computer: status / side preview / takeover, wallpaper, `/workspace` files, sandbox-terminal
- Routines (cron-function op Netlify)

Zonder LLM-key antwoordt de lokale orchestrator (tool-traces, kaarten, handoffs). Met `OPENAI_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY` of een key in Instellingen gaat de modelrouter daar naartoe.

## Netlify

`netlify.toml` bouwt Next.js. Identity/Database kun je op de site aanzetten; lokaal gebruikt Crew `.data/crew.json`. Schema voor Postgres: `lib/db/schema.ts`.
