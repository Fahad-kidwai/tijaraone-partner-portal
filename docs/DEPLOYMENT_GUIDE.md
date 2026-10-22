# Deployment Guide

A generic checklist for deploying this app (Next.js 14 + Prisma + Neon) to any Node host.
Written for a manual deploy — no host-specific config files live in this repo.
Secrets are never written here; only environment variable **names** are listed.

## 1. Prepare the database

- [ ] In Neon, use the **production** branch (keep `dev` for local work; never point local
      dev/seeds/tests at production).
- [ ] Copy both connection strings for that branch from the Neon console:
      pooled (host contains `-pooler`) and direct/unpooled.

## 2. Set environment variables on the host

Required:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string (production branch) |
| `DATABASE_URL_UNPOOLED` | Direct connection string (production branch) |
| `SESSION_SECRET` | Fresh random secret, 32+ chars (not the dev one) |
| `OTP_PEPPER` | Fresh random secret, 32+ chars (different from `SESSION_SECRET`) |
| `APP_URL` | Public URL, e.g. `https://portal.yourdomain` |
| `EMAIL_DRIVER` | `console` for the very first boot check, then `resend` (see step 6) |
| `CLIENT_IP_HEADER` | Header your host injects for the real client IP (step 5) |

Only when email goes live:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender on your verified domain, e.g. `TijaraOne <no-reply@yourdomain>` |

Do **not** set `NEON_BRANCH=dev` in production (it is a local safety label for dev scripts).
Do not copy `SEED_CEO_*` values anywhere except your local seed runs — the CEO is seeded once
from your machine against the production branch (step 3), not by the host.

## 3. Migrate and seed (from your machine, once)

Point a local `.env.local`-style env at the **production branch** values, then:

```bash
npm run db:deploy   # prisma migrate deploy — applies migrations via DATABASE_URL_UNPOOLED
npm run db:seed     # creates the CEO from SEED_CEO_* (idempotent)
```

Double-check you are targeting the production branch before running either.

## 4. Build and run

- [ ] Node.js 20 LTS on the host.
- [ ] Install: `npm ci`
- [ ] Build: `npm run build`
- [ ] Start: `npm start` (or the host's equivalent start command pointing at the Next server).
- [ ] Confirm the host preserves the security headers from `next.config.mjs` (they are set by
      Next itself; nothing host-side is needed).

## 5. Domain, HTTPS, client IP

- [ ] Attach the custom domain and enable HTTPS (HSTS is emitted automatically in production).
- [ ] Find the header your host sets for the real client IP (e.g. `x-nf-client-connection-ip`
      on Netlify, `cf-connecting-ip` behind Cloudflare) and set `CLIENT_IP_HEADER` to that
      exact header name. After deploy, check the logs: if you see
      `auth.client_ip_header_missing`, the name is wrong — per-IP OTP rate limiting is being
      skipped until you fix it.

## 6. Email (Resend)

- [ ] Verify your sending domain in Resend (SPF/DKIM/DMARC DNS records — whoever controls
      DNS must add these; deliverability depends on it).
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM` (sender on the verified domain).
- [ ] Switch `EMAIL_DRIVER` to `resend` and restart.
- [ ] Until then, if logs show `email.console_driver_startup_warning`, the app is running
      with the console driver in production and **no email is being delivered** — OTP sign-in
      will not work for anyone.

## 7. First-login check

- [ ] CEO: request an OTP at the CEO address → receive the email → sign in → land on `/admin`.
- [ ] Create a test partner in `/admin/partners` → partner receives the welcome email →
      partner signs in with OTP → lands on `/dashboard`.
- [ ] Partner generates a token → it appears in the CEO leads list (`/admin/leads`).
- [ ] Progress it one stage; confirm the partner view updates and **never** shows a total
      service fee.
- [ ] Check `/api/admin/export/leads.csv` downloads as CEO (and refuses a partner session).

## 8. If the Neon WebSocket adapter fails on your host

All database access goes through `src/lib/db.ts`, so the fallback is a one-file change:

1. In `src/lib/db.ts`, replace the adapter client with a plain Prisma client:
   `new PrismaClient()` (it reads the pooled `DATABASE_URL` from the environment over TCP).
2. Remove `@prisma/adapter-neon` and `ws` from `serverComponentsExternalPackages` in
   `next.config.mjs` only if you also remove their usage.
3. Rebuild, restart, and repeat the step-7 check. Keep the change as a separate commit so
   it can be reverted cleanly.

## 9. After go-live

- [ ] Schedule the monthly routine in `docs/OPERATIONS.md` (CSV exports + `pg_dump` backup).
- [ ] Schedule `npm run prune:otp` monthly (see `docs/OPERATIONS.md` §f).
- [ ] Before pointing real traffic at it: `npm test && npm run test:slow && npm run build`
      locally, all green.
