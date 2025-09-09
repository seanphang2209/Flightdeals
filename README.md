# Getaway SG (MVP)

Monorepo: Cloudflare-first, fast edge worker + Pages web app.

- Frontend: React + Vite + TS + Tailwind (Cloudflare Pages)
- API: Cloudflare Workers (Hono + Zod)
- Data: D1 (SQLite), KV (cache), Queues (+ Cron)
- Alerts: Resend email, optional Telegram

## Prereqs
- Node 18+
- pnpm
- wrangler (`npm i -g wrangler`)
- gh (GitHub CLI)

## Install
```bash
pnpm i
```

## Dev
```bash
pnpm dev
# API + Web start; wrangler provides local D1/KV bindings
```

## Database
```bash
pnpm db:migrate
pnpm seed:holidays
```

## Env (.dev.vars)
```
FLIGHT_API_BASE=https://tequila-api.kiwi.com
FLIGHT_API_KEY=sk_test_xxx
RESEND_API_KEY=re_***
TELEGRAM_BOT_TOKEN=***
TELEGRAM_CHAT_ID=***
```

## Deploy
- Configure `wrangler.toml` bindings
- `wrangler deploy` for API
- Connect `apps/web` to Cloudflare Pages 