# TijaraOne Partner Portal

Private, invite-only referral portal for TijaraOne (UAE business setup services).

- **CEO** signs in, creates/activates partner accounts, works every referred lead through the
  pipeline (New → Advance Pending → Advance Taken → In Process → Client Closed, or Lost),
  sets the commission, and marks commissions paid.
- **Partners** sign in with an email one-time code, generate referral tokens (leads) for
  clients, and track each token's stage and their commission (Expected → Payable → Paid).

There is no public sign-up. The CEO creates every account. Partners can never see another
partner's data, and never see the total service fee — only their own commission amount and %.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 14 (App Router) + React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3, `lucide-react` icons |
| Database | Neon Postgres (free tier), Prisma ORM |
| DB access | All behind `src/lib/db.ts` (Prisma + Neon WebSocket adapter, pooled URL) |
| Auth | Email OTP (HMAC-hashed codes, DB rate limits) + JWT session cookie (`jose`), revocation via `sessionVersion` |
| Email | Adapter in `src/lib/email.ts` — `console` driver (dev) or Resend |
| Validation | zod shared schemas (client + server) |
| Tests | Vitest against a Neon **dev branch** only |

Prisma packages are pinned exactly (`prisma`, `@prisma/client`, `@prisma/adapter-neon` — all `6.19.3`, no `^`).

## Local setup (clone → running with a seeded CEO)

Prerequisites: Node.js 20 LTS, a Neon account (free), and a terminal.

```bash
git clone <this repo>
cd tijaraone-partner-portal
npm install
```

1. **Create a Neon `dev` branch** (Neon console → your project → Branches → New branch, named `dev`).
   All local work uses this branch. **Never run local dev, seeds, or tests against the
   production branch.**
2. **Configure `.env.local`** — copy `.env.example` to `.env.local` and fill it in:
   - `DATABASE_URL` = the branch's **pooled** connection string (host contains `-pooler`)
   - `DATABASE_URL_UNPOOLED` = the branch's **direct** connection string (no `-pooler`);
     Prisma Migrate uses this via `directUrl`
   - `NEON_BRANCH=dev` (safety guard read by dev scripts/tests)
   - generate `SESSION_SECRET` and `OTP_PEPPER` (32+ random chars each, different from each other)
   - `EMAIL_DRIVER=console` for local dev
   - `SEED_CEO_EMAIL` / `SEED_CEO_NAME` / `SEED_CEO_PHONE` = the CEO account to seed
3. **Migrate + seed:**
   ```bash
   npm run db:migrate     # applies migrations to the dev branch (direct URL)
   npm run db:seed        # seeds the CEO from SEED_CEO_* (idempotent)
   ```
4. **Run:**
   ```bash
   npm run dev            # http://localhost:3000
   ```

### How dev OTP sign-in works

With `EMAIL_DRIVER=console` **and** `NODE_ENV=development`, requesting a sign-in code prints the
full email — including the 6-digit code — in the `npm run dev` terminal. Copy the code into the
sign-in form. This print exists only in development; a production server never prints codes or
full email addresses anywhere (recipients are masked in logs, e.g. `f***@example.com`).

Optional dev fixtures (3 clearly-labelled test partners):

```bash
npm run db:seed:dev      # CEO + fixture partners; refuses unless NEON_BRANCH=dev
```

## Environment variables

Names and meanings only — values live in `.env.local` (local) or the host's env settings (production).

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Pooled Neon connection string used by the running app (via the Prisma Neon adapter) |
| `DATABASE_URL_UNPOOLED` | Direct (non-pooled) Neon connection string; used by Prisma Migrate (`directUrl`) and `scripts/backup.sh` |
| `SESSION_SECRET` | HMAC secret for session JWTs (min 32 chars) |
| `OTP_PEPPER` | Separate HMAC secret for hashing OTP codes (min 32 chars) |
| `EMAIL_DRIVER` | `console` (dev: prints emails in the terminal) or `resend` |
| `RESEND_API_KEY` | Resend API key (required when `EMAIL_DRIVER=resend`) |
| `EMAIL_FROM` | Sender identity for outgoing mail, e.g. `TijaraOne <no-reply@yourdomain>` |
| `APP_URL` | Public base URL of the deployment (used in email links) |
| `CLIENT_IP_HEADER` | Name of the header your host sets to the **real client IP** (see below). Blank = per-IP OTP limit skipped |
| `NEON_BRANCH` | Safety label for scripts/tests. Must be `dev` locally; dev-only scripts refuse otherwise |
| `SEED_CEO_EMAIL` / `SEED_CEO_NAME` / `SEED_CEO_PHONE` | The single CEO account, used by the seed/reset scripts only |

### `CLIENT_IP_HEADER`

OTP requests are rate-limited per email **and** per client IP. The app must know which request
header carries the real client IP on your host — e.g. `x-nf-client-connection-ip` (Netlify),
`cf-connecting-ip` (Cloudflare). Spoofable `x-forwarded-for` is never trusted in production.
If the configured header is missing on a request, the per-IP limit is **skipped** (per-email
limits still apply — there is deliberately no shared "unknown IP" bucket) and the warning
`auth.client_ip_header_missing` is logged once per process. Treat that log line in production
as a misconfiguration to fix.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / production server |
| `npm test` | Fast test suite (excludes the slow matrix) |
| `npm run test:slow` | Slow suite (full 6×6 lead-transition matrix) |
| `npm run test:all` | Fast + slow. **Both suites must pass before any sign-off** |
| `npm run db:migrate` | Create/apply migrations locally (dev branch) |
| `npm run db:deploy` | Apply migrations to the target DB (used in production deploys) |
| `npm run db:seed` | Seed/refresh the CEO from `SEED_CEO_*` |
| `npm run db:seed:dev` | Seed CEO + 3 dev fixture partners (dev branch only) |
| `npm run db:reset:dev` | **Wipe** all leads, events, OTP codes and partners on the dev branch, then re-seed the CEO (dev branch only, prints row counts) |
| `npm run prune:otp` | Delete OTP code rows older than 7 days (prints a count) |
| `npm run db:check` | Connectivity check through the app's Prisma client |

Operations (backups, corrections, email changes, emergencies, free-tier watch list):
see [`docs/OPERATIONS.md`](docs/OPERATIONS.md). Deploying: see
[`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md). Full design history:
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Security notes

- OTP codes are stored as HMAC hashes (never plaintext), expire in 10 minutes, allow 5 attempts,
  and are rate-limited per email and per IP in the database.
- Sessions are JWT cookies (HttpOnly, Secure in production, SameSite=Lax). Changing a user's
  email or deactivating a partner bumps `sessionVersion`, instantly revoking all live sessions.
- Money: commissions are computed server-side from stable 2-decimal strings (no float maths),
  `commissionAmount = ROUND_HALF_UP(total service fee × % / 100, 2)`. The partner API surface
  **never** includes the total service fee, internal notes, lost reasons, or duplicate flags.
- The `LeadEvent` log is append-only; stage/commission history is never edited in place.
- Structured logs must never contain OTP codes, full emails (masked only), phone numbers, note
  text, or amounts. Exports (CSV) are audit-logged with filter summary + row count, no PII values.
- Security headers (CSP, `nosniff`, referrer policy, frame denial, permissions policy, HSTS in
  production) are set host-agnostically in `next.config.mjs`.

## Known limitations

- **One CEO account** at launch (by design).
- **Logout** clears the cookie; a copied cookie remains valid until expiry or a `sessionVersion`
  bump (accepted at this scale).
- **Post-payment commission corrections have no UI** — they are a documented developer-run
  procedure with a manual audit event (see `docs/OPERATIONS.md`).
- The dashboards' "Leads by stage" is a **current-state snapshot, not a cohort conversion
  funnel** (labelled as such in the UI).
- Duplicate detection keys on exact phone (E.164) + service; the same client on a second number
  is only catchable manually (CEO search).
- Free-tier ceilings (Neon storage/compute + short restore window, Resend daily cap) are sized
  for 10–50 users; the watch list lives in `docs/OPERATIONS.md`.
- Email is the single point of failure for sign-in (OTP). An emergency CEO access procedure is
  documented in `docs/OPERATIONS.md` — never add a backdoor endpoint.
