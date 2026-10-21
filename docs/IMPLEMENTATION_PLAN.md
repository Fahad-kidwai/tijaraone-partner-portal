# TijaraOne Partner Portal — Implementation Plan

> **Status:** APPROVED by Fahad on 2026-10-20, with the decisions recorded in §11 (Q1–Q12; Q12 still to be filled in by Fahad). Phase 0 only is authorised; no later phase may start without separate approval.
> **Amendment 2026-10-20:** Q7 resolved by Fahad — commission is **percentage-based, default 25% of the total service fee** (not a fixed AED figure). Schema, state machine, API, UI, and tests updated accordingly (§2, §4, §6, §7, §8, Q7/Q7a in §11).
> **Source of truth:** the business brief dated 2026-10-20. Where the existing prototype conflicts with the brief, the brief wins.
> **Working rule:** implement **one phase at a time** (§9), stop after each phase for review, do not start the next phase without sign-off.

**Verified repo facts (checked 2026-10-20, not taken on trust):**

- Next.js `^14.2.15` (App Router), React 18, TypeScript strict, Tailwind 3.4, `lucide-react`, `sharp`. No Prisma, no zod, no tests, no `middleware.ts`, no `src/app/api/**`, no `next.config.*`, no README.
- `src/app/page.tsx` — 313 lines, username+password login against mock data, demo quick-fill buttons, writes `tijaraone_admin_session` / `tijaraone_partner_session` to `localStorage`.
- `src/app/dashboard/page.tsx` — 1,171 lines; `src/app/admin/page.tsx` — 1,334 lines. Both are single-file monoliths mixing layout, sidebar, tables, modals, fake charts and `localStorage` persistence (18 `localStorage`/`sessionStorage` call sites across the app).
- `src/app/client/page.tsx` — **499 lines, not a bare redirect**: a `useEffect` redirects to `/`, but ~460 lines of unreachable client-portal UI sit below it. Dead code, confirmed for deletion.
- `src/lib/mockData.ts` — 583 lines: `INITIAL_CEO` (plaintext `admin123`), 10 partners (all plaintext `password123`, with tiers/categories/locations/avatars), ~25 fake clients with ~25 ad-hoc service names, commission as strings (`"AED 2,500"`), client usernames/passwords, milestones and documents.
- `src/lib/types.ts` — `ClientStatus = Completed | In Progress | Pending`, `ClientRecord`, `PartnerUser`, `CEOUser` — all modelled on the mock world.
- `src/lib/translations.ts` — 445 lines, `en`/`ar`/`ru` dictionaries keyed to the old UI (old statuses, old services). Deleted for v1 (Q4: English-only, §11).
- `.env.local` contains only `VERCEL_OIDC_TOKEN` (created by Vercel CLI). No application secrets exist yet. `.gitignore` already ignores `.env*` except `.env.example` — good.
- `public/images/**` contains a large number of heavy, mostly unreferenced assets (bank logos, freezone logos, hero photos, reference screenshots). Only a handful are actually used (skyline login background, TijaraOne logos). Audit before deleting (§1).
- Brand tokens in `tailwind.config.js`: `brand.blue #2114BF`, `royal #004DD9`, `sky #1F83F5`, `cyan #5FE7FD`, `lime #CEF75B`, `dark #0A1128`. Login additionally uses hard-coded `#0052FF`/`#011550` inline. These are kept as the visual identity (§8).

---

## 1. Gap analysis (file by file)

Legend: **KEEP** = stays essentially as-is · **REFACTOR** = reused but substantially rewritten · **DELETE** = removed.

| Path | Verdict | Why / what happens |
|---|---|---|
| `src/app/page.tsx` (login) | **REFACTOR** | Keep the skyline background (`/images/portal_bg.jpg`), TijaraOne branding header, white rounded card with blue gradient banner, and the 3 trust badges — this is the approved look. Delete: username/password fields, `INITIAL_CEO`/`INITIAL_PARTNERS` checks, demo quick-fill buttons, "forgot password", "remember me", all `localStorage` session writes, and the language selector (Q4: English-only). Replace with the two-step email → OTP form (§3, §8). |
| `src/app/dashboard/page.tsx` (1,171 lines) | **DELETE & REBUILD** (as several files) | Nothing in its data flow survives: state comes from `INITIAL_*` mocks + `localStorage`, statuses/services/commissions are the wrong model. Reusable: sidebar layout pattern, card/table styling, badge styling, header pattern — extracted into shared components (§8), then this file is replaced by thin route pages under `src/app/dashboard/**`. The "Generate Client ID" modal becomes the Generate Token page; "Marketing Materials"/"Training" modals are deleted; "Support" collapses to a `mailto:`/`wa.me` link. |
| `src/app/admin/page.tsx` (1,334 lines) | **DELETE & REBUILD** (as several files) | Same reasoning. "Onboard client" modal is deleted (Q1 default: CEO does not create leads). String commission parsing (`"AED 2,500"`, regex digit-stripping) is deleted — commission becomes `Decimal`. Sidebar/card styling feeds the shared components. Replaced by route pages under `src/app/admin/**`. |
| `src/app/client/page.tsx` (499 lines) | **DELETE** (whole route) | Client portal is explicitly out of scope. The route already redirects; the remaining ~460 lines are unreachable. Deleting also removes the last `tijaraone_client_session` reference. |
| `src/lib/mockData.ts` (583 lines) | **DELETE** | Plaintext passwords, fake partners/clients, wrong service catalogue. No part of this is imported by the new code. (If demo seed data is wanted for local dev, it is recreated as an optional, clearly-labelled dev seed in Phase 0 — never shipped credentials.) |
| `src/lib/types.ts` | **DELETE & REPLACE** | Replaced by DTO types derived from the shared zod schemas in `src/lib/schemas.ts` (§5/§6). `Completed/In Progress/Pending`, string commissions, `Milestone`/`ClientDocument`, partner `category`/`location`/avatar fields all disappear. |
| `src/lib/translations.ts` (445 lines) | **DELETE** | Q4 resolved: English-only for v1. The file and the language switcher are removed everywhere (login, partner and CEO shells, client route); all copy is inlined English. Re-adding i18n later (including proper RTL, which the current switcher never implemented) is a separate workstream. |
| `src/app/layout.tsx` | **REFACTOR (small)** | Keep metadata/branding. Add: font/Toaster mount point, security-friendly defaults. Body background classes are currently dark-navy while inner pages paint their own light backgrounds — normalise in Phase 0 so route groups control their own chrome. |
| `src/app/globals.css` (29 lines) | **KEEP (minor edits)** | Tailwind directives + scrollbar styling stay. Add focus-visible ring defaults and OTP input helpers if needed. No design-system overhaul. |
| `tailwind.config.js` | **KEEP** | Brand tokens are the visual identity. Content globs already cover `src/components/**` and `src/app/**`. No changes expected beyond possibly adding a `fontFamily` if a font is adopted (not planned). |
| `tsconfig.json` | **KEEP** | Strict mode + `@/*` alias already correct. No change. |
| `postcss.config.js`, `next-env.d.ts` | **KEEP** | Standard, untouched. |
| `package.json` | **REFACTOR** | Add deps (§5): `prisma`, `@prisma/client`, `zod`, `jose`, `libphonenumber-js`, `resend` (behind adapter), `vitest` + test script, seed/migrate scripts. Remove nothing initially; `sharp` appears unused by app code (Next's image optimisation uses it transitively) — verify and drop in Phase 6 if truly unused. `next lint` is deprecated upstream; keep for now, no linter migration in scope. |
| `.env.local` | **KEEP (local only, never committed)** | Currently holds only `VERCEL_OIDC_TOKEN`. Real secrets are added locally + in the hosting provider's env settings (Phase 0/6). |
| `.gitignore` | **KEEP (small addition)** | Already correct on env files. Add `/prisma/*.db` style local artefacts only if a local SQLite fallback is ever used (not planned — Neon dev branch instead). |
| `.vercel/project.json` | **KEEP** | Existing Vercel project link. Hosting decision itself is an open risk (§10) — the file stays until that is decided. |
| `public/images/**` | **AUDIT, then mostly DELETE (Phase 6)** | Keep only referenced assets (login skyline, logos actually rendered, favicon). Bank/freezone/hero/reference images belong to a marketing site, not this portal, and bloat deploys. Deletion happens only after a reference scan (`rg` for each filename) in Phase 6 — not before, to avoid breaking the kept login art. |
| *(new)* `prisma/`, `src/app/api/**`, `src/lib/{db,auth,email,leads,env}.ts`, `src/lib/schemas.ts`, `src/components/**`, `src/middleware.ts`, `tests/**`, `.env.example`, `docs/`, `README.md` | **CREATE** | Per §5–§8 and Phase 0–6. |

**Explicitly deleted concepts (requirements win over prototype):** passwords & demo logins, partner tiers/categories/locations/avatar URLs, ~25 ad-hoc services → exactly 5, string commissions → `Decimal` AED, `Completed/In Progress/Pending` → the 6-stage pipeline, CEO manual client onboarding (pending Q1), client portal, Marketing Materials/Training features, all `localStorage` state.

---

## 2. Final Prisma schema

The brief's sketch is sound. Refinements made (each is a deliberate change, listed so they can be rejected individually):

1. **`LostReason` enum + `lostReasonNote`** instead of a free-text `lostReason String?` — the brief specifies a dropdown; an enum makes filtering/reporting and validation honest. Free text survives as the optional note.
2. **`LeadEventType` enum** instead of `type String` — prevents typo'd event types silently breaking the timeline.
3. **`actor` relation on `LeadEvent`** (sketch had a bare `actorId String`) — timeline needs actor name/role; a relation also gives referential integrity. `onDelete: Restrict` so users with history can't vanish.
4. **Duplicate flagging is modelled, not implied:** `isPossibleDuplicate Boolean` + `duplicateOfId` self-relation on `Lead`. §6 of the brief requires a CEO-visible "possible duplicate" badge; computing it on every read is wasteful and racy. It is computed once, transactionally, at creation (§6).
5. **`sessionVersion Int @default(0)` on `User`** — JWTs are stateless; without this, a deactivated-then-reactivated or compromised account's old cookie stays valid for 7 days. Deactivation (and an explicit "sign out everywhere") increments it; every authenticated request compares it (§3). Cheap, no session table, no Redis.
6. **`OtpCode` gains `@@index([ip, createdAt])`** — the IP rate limit (10/hour) must be an indexed query, and an index on `email` alone doesn't serve it. Rate limiting is served entirely by counting `OtpCode` rows — no separate rate-limit table needed at this scale.
7. **`User.updatedAt`, `createdById` (nullable self-relation)** — audit of who created a partner; costs nothing.
8. **Indexes for the actual query patterns:** `Lead @@index([partnerId, createdAt])` (partner lists), `@@index([commissionStatus, commissionPaidAt])` (commission ledger), `User @@index([role, isActive])` (partner lists, CEO lookup for notifications).
9. **Commission is percentage-based (Q7, resolved 2026-10-20):** the CEO enters a `totalAmount` (the **full service fee charged to the client**, AED `Decimal(12,2)` — UI label "Total service fee (AED)"); `commissionPercent` is a `Decimal(5,2)` **defaulting to 25.00** (pre-filled, editable per lead — see §4.2); `commissionAmount` is the **computed, stored snapshot** `ROUND(totalAmount × commissionPercent / 100, 2)`, never accepted directly from a client. All three are nullable, written **only** by the state machine (§4), and cleared together on `LOST`. Invariants (all three present ⟺ status ≠ `NOT_SET`; `commissionAmount` always equals the rounded product of the other two) are enforced in one service function and covered by tests — Prisma cannot express them. Changing the 25% default later is a one-line constant change (`DEFAULT_COMMISSION_PERCENT` in the shared schemas module), not a migration; there is no per-partner rate table in v1.
10. **No `Session` model, no soft-delete on `Lead`** — sessions are JWTs; leads are never deleted at all (append-only history). Partners are deactivated, never deleted (`isActive`); the delete-partner endpoint simply does not exist.
11. **Money note:** Prisma `Decimal` serialises to a string in JSON. API DTOs convert explicitly (`amount.toString()`, plus a pre-formatted `AED x,xxx.xx` display string built server-side in `Asia/Dubai`-aware code) so the client never does float maths on money.
12. **Neon + Prisma:** `DATABASE_URL` = pooled connection (PgBouncer) for the app; `DATABASE_URL_UNPOOLED` (the name `neon env pull` writes) = direct connection for `prisma migrate` via Prisma's `directUrl`. Both are required env vars — this is the standard Neon setup and avoids well-known migration failures over a pooler. **Driver (settled at Neon setup, 2026-10-20):** Prisma stays the ORM; the app client (`src/lib/db.ts`) runs through `@prisma/adapter-neon` (Neon serverless driver, WebSocket transport) on the pooled URL — the recommended transport for Netlify's serverless functions — while migrations use the direct URL over TCP. Project `calm-pond-23217788`, branch `production` (`br-weathered-smoke-zal7nlpi`), declared in `neon.ts`.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Neon pooled (app runtime)
  directUrl = env("DATABASE_URL_UNPOOLED") // Neon direct (migrations only)
}

enum Role {
  CEO
  PARTNER
}

enum ServiceType {
  MAINLAND_SETUP      // "Mainland Setup"
  FREEZONE_LICENSE    // "Freezone License"
  CORPORATE_TAX       // "Corporate Tax"
  BANK_ACCOUNT_SETUP  // "Bank Account Setup"
  GOLDEN_VISA         // "Golden Visa"
}

enum LeadStage {
  NEW
  WON_ADVANCE_PENDING
  WON_ADVANCE_TAKEN
  WON_IN_PROCESS
  WON_CLOSED
  LOST
}

enum CommissionStatus {
  NOT_SET
  EXPECTED   // set, lead still in flight (ADVANCE_TAKEN / IN_PROCESS)
  PAYABLE    // WON_CLOSED, unpaid
  PAID
}

enum LostReason {
  PRICE
  NO_RESPONSE
  WENT_ELSEWHERE
  NOT_ELIGIBLE
  OTHER
}

enum LeadEventType {
  CREATED
  STAGE_CHANGED
  COMMISSION_SET
  COMMISSION_UPDATED
  COMMISSION_PAID
  NOTE_UPDATED
  REOPENED
  MARKED_DUPLICATE
}

model User {
  id             String    @id @default(cuid())
  role           Role
  name           String
  email          String    @unique // ALWAYS stored lowercase + trimmed (enforced in service layer, tested)
  phone          String    // E.164, validated with libphonenumber-js
  companyName    String?   // partners: required by API validation; CEO: null
  isActive       Boolean   @default(true)
  sessionVersion Int       @default(0) // bump to revoke all sessions (deactivate / force logout)
  lastLoginAt    DateTime?
  createdById    String?
  createdBy      User?     @relation("UserCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdUsers   User[]    @relation("UserCreatedBy")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  leads       Lead[]      @relation("PartnerLeads")
  actedEvents LeadEvent[] @relation("EventActor")

  @@index([role, isActive])
}

model OtpCode {
  id         String    @id @default(cuid())
  email      String    // normalised (lowercase + trim) before insert
  codeHash   String    // HMAC-SHA256(code, OTP_PEPPER); plaintext code NEVER stored or logged
  expiresAt  DateTime  // createdAt + 10 min
  consumedAt DateTime? // set on success, on invalidation (newer code requested), and on lockout
  attempts   Int       @default(0) // wrong-code attempts; locked at 5
  ip         String?
  createdAt  DateTime  @default(now())

  @@index([email, createdAt])
  @@index([ip, createdAt])
}

model Lead {
  id                String           @id @default(cuid())
  token             String           @unique // "TJ-" + 6 chars, unambiguous alphabet (§6)
  partnerId         String
  partner           User             @relation("PartnerLeads", fields: [partnerId], references: [id], onDelete: Restrict)
  clientName        String
  clientPhone       String           // E.164
  serviceType       ServiceType
  requirementNote   String?
  stage             LeadStage        @default(NEW)
  stageChangedAt    DateTime         @default(now())
  lostReason        LostReason?
  lostReasonNote    String?
  internalNote      String?          // CEO ONLY — never selected into a partner DTO
  totalAmount       Decimal?         @db.Decimal(12, 2) // AED; FULL service fee charged to client ("Total service fee (AED)"), entered by CEO at Advance Taken. CEO-only — never in partner DTOs (Q7a)
  commissionPercent Decimal?         @db.Decimal(5, 2)  // % of totalAmount; defaults to 25.00, editable per lead until PAID
  commissionAmount  Decimal?         @db.Decimal(12, 2) // AED; computed ROUND(totalAmount * commissionPercent / 100, 2) — never client-supplied
  commissionStatus  CommissionStatus @default(NOT_SET)
  commissionPaidAt  DateTime?
  commissionPaidRef String?
  isPossibleDuplicate Boolean        @default(false)
  duplicateOfId     String?
  duplicateOf       Lead?            @relation("LeadDuplicates", fields: [duplicateOfId], references: [id], onDelete: SetNull)
  duplicates        Lead[]           @relation("LeadDuplicates")
  firstViewedAt     DateTime?        // set on CEO's first detail view → drives "unattended" flag
  closedAt          DateTime?        // set entering WON_CLOSED, cleared on undo
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  events            LeadEvent[]

  @@index([partnerId, stage])
  @@index([partnerId, createdAt])
  @@index([stage, createdAt])
  @@index([clientPhone])
  @@index([commissionStatus, commissionPaidAt])
}

model LeadEvent {
  // Append-only. No updatedAt, no deletes (Lead delete does not exist;
  // Cascade retained only so test/seed teardown works).
  id        String        @id @default(cuid())
  leadId    String
  lead      Lead          @relation(fields: [leadId], references: [id], onDelete: Cascade)
  actorId   String
  actor     User          @relation("EventActor", fields: [actorId], references: [id], onDelete: Restrict)
  type      LeadEventType
  fromStage LeadStage?
  toStage   LeadStage?
  meta      Json?         // e.g. { totalAmount: "10000.00", commissionPercent: "25.00", commissionAmount: "2500.00", lostReason: "PRICE", paidRef: "…" }
  createdAt DateTime      @default(now())

  @@index([leadId, createdAt])
}
```

**Seed (`prisma/seed.ts`):** upserts exactly one CEO from `SEED_CEO_EMAIL` / `SEED_CEO_NAME` / `SEED_CEO_PHONE` (all env, all validated; seed refuses to run if unset). Idempotent — safe to re-run. An optional `--dev-fixtures` flag creates 3 named fake partners + sample leads **only** when `NODE_ENV !== "production"`; there are no default credentials anywhere.

**Migrations:** committed under `prisma/migrations/`. `prisma migrate deploy` in the deploy pipeline; never `db push` against Neon production.

---

## 3. Auth design (email OTP + signed session cookie)

### 3.1 Flow

```
Partner/CEO → POST /api/auth/request-otp { email }
            ← 200 { ok: true, message: "If this email is registered, a code has been sent." }   (ALWAYS, verbatim)
            → POST /api/auth/verify-otp { email, code }
            ← 200 { user: { id, role, name } }  + Set-Cookie: tj_session=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
            → GET /api/me  → current user DTO (used by the app shell; 401 if no/invalid session)
            → POST /api/auth/logout → clears cookie (Max-Age=0)
```

### 3.2 OTP issuance (`request-otp`)

1. Normalise email (`trim().toLowerCase()`), validate with zod. **Every** response — registered, unregistered, inactive, rate-limited — is the identical generic `200` body. (Rate-limited requests also return the generic body; we simply don't send. This keeps enumeration and limit-probing indistinguishable. Trade-off accepted and documented: a legitimate user who is rate-limited sees "check your email" with nothing arriving; the UI's resend countdown + support line is the escape hatch.)
2. Rate-limit checks, all as indexed `OtpCode` counts (DB-only, per brief):
   - per email: ≥ 3 codes in last 15 min → do not send.
   - per IP: ≥ 10 codes in last hour → do not send. IP from `x-forwarded-for` first hop (Vercel/host-provided), falling back to `x-real-ip`; never trusted for anything except limiting.
   - resend cooldown: latest code for this email < 30 s old → do not send (UI also disables resend for 30 s; server is authoritative).
3. Look up `User` by normalised email. Send **only if** found **and** `isActive`. Otherwise: no row is created either — *decision:* we do **not** persist OTP rows for unknown emails, because (a) they can never verify, (b) it prevents unbounded unauthenticated writes filling the table. Rate-limit counts for unknown emails therefore only apply per-IP. Documented deviation risk: negligible at this scale.
4. Generate code: 6 digits via `crypto.randomInt(0, 1_000_000)`, zero-padded (CSPRNG, unbiased). Never `Math.random()`.
5. In one transaction: invalidate all prior unconsumed codes for the email (`consumedAt = now`), insert the new `OtpCode` with `codeHash = HMAC-SHA256(code, OTP_PEPPER)` (hex), `expiresAt = now + 10 min`, `ip`.
6. Send via `sendEmail()` adapter (§3.5), awaited with the timeout described there. In `NODE_ENV=development`, the console driver logs the OTP code to the server console **only** (this is the one sanctioned place a code appears; production never logs it). In production, logs record only a **masked email** — first letter of the local part plus the domain (e.g. `f***@tijaraone.ae`) — never the full address and never the code. Email failure is logged as a generic send-failure event (masked recipient, provider error class, no code/PII) and the API still returns the generic success, so the endpoint can't be used to probe provider state.

### 3.3 OTP verification (`verify-otp`)

1. zod-validate `{ email, code: /^\d{6}$/ }`. Normalise email.
2. Fetch the latest unconsumed `OtpCode` for the email. If none, or `expiresAt < now` → `401 { error: "Invalid or expired code" }` (single message for all failure modes).
3. Compare `HMAC-SHA256(submitted, OTP_PEPPER)` to `codeHash` with `crypto.timingSafeEqual`. On mismatch: `attempts += 1`; if `attempts >= 5`, set `consumedAt` (lockout). Return the same generic `401`.
4. On match, in one transaction: set `consumedAt`, load the `User`, re-check `isActive` (a partner deactivated mid-flow must not get in → generic `401`), set `lastLoginAt`.
5. Issue session (§3.4), return the minimal user DTO. Redirect target is decided client-side from `role` (`CEO → /admin`, `PARTNER → /dashboard`) and re-enforced by middleware + handlers.

### 3.4 Session

- **JWT (HS256) via `jose`**, signed with `SESSION_SECRET` (≥ 32 bytes, env-only). Claims: `sub` (user id), `role`, `sv` (user's `sessionVersion` at issue time), `iat`, `exp` = 7 days. No email/name in the token (keeps PII out of cookies/logs).
- Cookie name `tj_session`: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`. (`Secure` omitted only when `NODE_ENV=development` so local http works.)
- **Authoritative check on every authenticated request** — a single `requireUser()` / `requireRole()` helper in `src/lib/auth.ts` used by **every** route handler and server component that reads data:
  1. verify JWT signature + expiry,
  2. load `User` by `sub` from the DB,
  3. reject (`401`/`403`) if missing, `!isActive`, or `user.sessionVersion !== sv`.
  This is what makes deactivation an instant lockout, as required. The DB hit per request is trivial at 10–50 users.
- `POST /api/auth/logout` clears the cookie. (A stolen cookie technically remains valid until expiry unless `sessionVersion` is bumped — accepted for v1; deactivation/force-logout via the CEO covers the realistic case. Noted in §10.)
- **CSRF defence in depth:** all mutating handlers assert `Origin` (fallback `Referer`) host === `Host`; mismatch → `403`. Combined with `SameSite=Lax` this is sufficient at this scale; no CSRF-token machinery.
- **Middleware (`src/middleware.ts`)** is an *optimistic* gate only: it verifies the JWT (edge-compatible `jose`) and enforces `/admin/*` → CEO-only, `/dashboard/*` → PARTNER-only, `/` → redirect logged-in users to their home. It does **not** touch the DB (Prisma is not edge-safe here), so `isActive`/`sessionVersion` enforcement lives in handlers/layouts as above. This split is deliberate and will be commented as such, so nobody later mistakes middleware for the security boundary.
- CEO bootstrap: seed script only (§2). No hardcoded password anywhere; CEO uses the identical OTP flow.

### 3.5 Email adapter (`src/lib/email.ts`)

```ts
export interface SendEmailInput { to: string; subject: string; html: string; text: string }
export async function sendEmail(input: SendEmailInput): Promise<void>
```

- Implementation selected by env: `EMAIL_DRIVER=console` (dev default — logs, incl. OTP in dev only) or `resend` (production, `RESEND_API_KEY`, `EMAIL_FROM` on the verified domain). Callers never import Resend directly, so Brevo/SMTP can replace it later.
- **All sends are awaited — never fire-and-forget, never `waitUntil`.** Netlify (the target host, Q11) may cut off background work once the response is sent, so every caller does `await sendEmail(...)` wrapped in a timeout of ~3–5 s (`AbortController`/provider timeout) inside `try/catch`. A failed or slow email **never fails the business operation**: notification failures are logged (event name + lead id, no PII payloads) and the operation returns success. For OTP specifically, the same rule applies to the API response (the generic §3.2 response is unchanged), but the failure is logged at error level (`auth.otp_send_failed`, masked email) so a broken email provider is visible in logs immediately instead of surfacing as "partners can't log in" reports.
- Templates are small hand-written HTML/text pairs in `src/lib/emails/*` — no template engine.

### 3.6 Security/ops details

- Env validated at boot with zod (`src/lib/env.ts`, imported by everything server-side): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`, `OTP_PEPPER`, `RESEND_API_KEY` (prod), `EMAIL_FROM`, `APP_URL`, `SEED_CEO_*` (seed only). App refuses to start on invalid env — fail loud, not at first login.
- Structured logs (plain `console` JSON at this scale): `auth.otp_requested`, `auth.otp_verify_failed` (reason enum only), `auth.login_success`, `lead.stage_changed`, `commission.paid` — ids and enums, **never** codes, emails in full, phone numbers, or note contents.
- Expired/consumed `OtpCode` rows: pruned by a `prisma` cleanup script runnable manually/scheduled (delete where `createdAt < now - 7 days`); documented in README. No cron infrastructure in v1.

---

## 4. Lead state machine

Implemented once, server-side, in `src/lib/leads/stateMachine.ts` as a pure, unit-tested module. Every stage/commission mutation goes through `transitionLead()`; there is no other code path that writes `stage`, `commission*`, `lost*`, or `closedAt`. All transitions run in a Prisma transaction that also appends the `LeadEvent`(s) — a stage change without its event (or vice versa) must be impossible.

### 4.1 Allowed transitions

| From | To | Who | Required input | Side effects (same transaction) |
|---|---|---|---|---|
| — (create) | `NEW` | PARTNER (own) | clientName, clientPhone (E.164), serviceType, optional note | Token generated; duplicate check (§6); `LeadEvent(CREATED)`; CEO notification email |
| `NEW` | `WON_ADVANCE_PENDING` | CEO | — | `stageChangedAt`, `LeadEvent(STAGE_CHANGED)` |
| `NEW` | `LOST` | CEO | `lostReason` (+ optional note) | `LeadEvent(STAGE_CHANGED, meta.lostReason)` |
| `WON_ADVANCE_PENDING` | `WON_ADVANCE_TAKEN` | CEO | `totalAmount` (AED, > 0); `commissionPercent` optional (defaults to **25**) | Server computes `commissionAmount = ROUND(totalAmount × percent / 100, 2)`; `commissionStatus=EXPECTED`, `LeadEvent(STAGE_CHANGED)` + `LeadEvent(COMMISSION_SET, meta:{totalAmount, commissionPercent, commissionAmount})`; partner email |
| `WON_ADVANCE_PENDING` | `LOST` | CEO | `lostReason` | as above |
| `WON_ADVANCE_TAKEN` | `WON_IN_PROCESS` | CEO | — | `LeadEvent(STAGE_CHANGED)` |
| `WON_ADVANCE_TAKEN` | `LOST` | CEO | `lostReason` | Commission exists → reset `totalAmount=null`, `commissionPercent=null`, `commissionAmount=null`, `commissionStatus=NOT_SET`, `LeadEvent(COMMISSION_SET, meta:{cleared:true, previousTotalAmount, previousPercent, previousAmount})` **then** stage event. CEO-only visibility. |
| `WON_IN_PROCESS` | `WON_CLOSED` | CEO | — | `commissionStatus=PAYABLE`, `closedAt=now`, `LeadEvent(STAGE_CHANGED)`; partner email |
| `WON_IN_PROCESS` | `LOST` | CEO | `lostReason` | Commission reset as above |
| `WON_CLOSED` | `WON_IN_PROCESS` (undo close) | CEO | — | Only if `commissionStatus != PAID`; `commissionStatus=EXPECTED`, `closedAt=null`, `LeadEvent(STAGE_CHANGED)` |
| `LOST` | `NEW` (reopen) | CEO | — | Clears `lostReason`/`lostReasonNote`; commission already `NOT_SET`; `LeadEvent(REOPENED)` |
| `WON_CLOSED` (no stage change) | mark paid | CEO | `paidAt` (date), optional `paidRef` | `commissionStatus=PAID`, `commissionPaidAt`, `commissionPaidRef`, `LeadEvent(COMMISSION_PAID)`; partner email. **Terminal for money.** |
| any non-`PAID` stage with commission set | edit commission | CEO | `totalAmount` > 0 and/or `commissionPercent` (0 < % ≤ 100) | Server recomputes `commissionAmount`; `LeadEvent(COMMISSION_UPDATED, meta:{from:{total,percent,amount}, to:{…}})`; status unchanged (`EXPECTED`/`PAYABLE` by stage) |
| any | edit internal note | CEO | `internalNote` | `LeadEvent(NOTE_UPDATED)` — meta contains **no note text** (PII hygiene); note itself is CEO-only |

**Everything else is rejected** — including: any partner-initiated transition (partners have no write endpoint for stage), `NEW → WON_ADVANCE_TAKEN` (skipping pending), `NEW → WON_CLOSED`, backward won-steps other than the two named undos (`WON_CLOSED → WON_IN_PROCESS`, `LOST → NEW`), `WON_ADVANCE_PENDING → WON_IN_PROCESS` (skipping taken), any transition out of `WON_CLOSED` except undo (and none once `PAID`), and re-marking paid. Rejection is `409 { error: { code: "INVALID_TRANSITION", message, allowedNext: [...] } }` so the UI can render exactly the legal next steps.

### 4.2 Validation rules (all server-side, zod + state machine; client mirrors for UX only)

- Commission inputs (Q7): `totalAmount` is required **iff** target is `WON_ADVANCE_TAKEN` — positive decimal, `> 0`, `≤ 10,000,000`, max 2 dp. `commissionPercent` is optional on that transition and **defaults to 25.00** when omitted; when supplied it must satisfy `0 < percent ≤ 100`, max 2 dp. `commissionAmount` is **never an accepted input anywhere** — the server computes it as `ROUND(totalAmount × commissionPercent / 100, 2)` using decimal arithmetic (Prisma `Decimal`, no JS floats), so e.g. total `AED 9,999.99` at 25% stores `AED 2,500.00` deterministically. Supplying any of these fields on a transition that doesn't accept them is a `400` — silently ignoring money input is worse than erroring. Until `PAID`, editing `totalAmount` and/or `commissionPercent` recomputes and re-snapshots `commissionAmount` atomically; after `PAID` all three are locked.
- *Resolved (Q7/Q7a):* `totalAmount` is the **full service fee charged to the client** (not just the advance); the UI field is labelled **"Total service fee (AED)"**. `commissionPercent` is pre-filled at 25 and **editable per lead by the CEO until `PAID`**. The partner sees the computed AED commission **and** the percent, but **never `totalAmount`** (Q7a, §4.3).
- `lostReason`: required **iff** target is `LOST`; must be a `LostReason` enum value; `lostReasonNote` optional, required only if product later decides `OTHER` needs text (v1: optional — flagged, not guessed).
- Mark-paid: `paidAt` must be a valid date, not in the future (allow today, `Asia/Dubai`); only from `WON_CLOSED` + `PAYABLE`; exactly once (`PAID` is locked — no edit of amount, date, or ref afterwards; corrections are a CEO↔developer data fix, documented in README, not a UI feature).
- `WON_CLOSED` requires the commission to already be set (it necessarily is, since `WON_ADVANCE_TAKEN` is the only path in — the invariant `totalAmount`, `commissionPercent`, `commissionAmount` all present and consistent is asserted in code and tested, so `PAYABLE` without a computed amount can never exist).
- Optimistic concurrency: the stage PATCH takes the `stage` the client saw (`expectedStage`) and the transaction updates `where: { id, stage: expectedStage }`; a mismatch (someone else moved it) → `409`. Prevents two-tabs-overwrite at zero infrastructure cost.
- Timestamps: stored UTC (DB), rendered `Asia/Dubai` everywhere (UI + emails + CSV). "This month" aggregates are computed on Dubai calendar boundaries converted to UTC — one helper, tested.

### 4.3 Commission visibility (partner DTO)

| Lead state | Partner sees |
|---|---|
| `NOT_SET` (no commission set) | "—" / nothing. Total, percent, amount, internal note, lost reason are **never** in the partner DTO (fields are excluded at the DTO mapper, not hidden in UI). |
| `EXPECTED` (`WON_ADVANCE_TAKEN`, `WON_IN_PROCESS`) | Computed AED amount labelled **Expected**, plus the percent (e.g. "AED 2,500 · 25%") — Q7a |
| `PAYABLE` (`WON_CLOSED`) | Computed AED amount labelled **Payable**, plus the percent |
| `PAID` | Computed AED amount labelled **Paid** + paid date, plus the percent |

**`totalAmount` is excluded from every partner DTO at every stage (Q7a),** even though it is arithmetically derivable from amount ÷ percent. The partner DTO mapper builds its object field-by-field (allow-list) and simply has no `totalAmount` key; a unit test asserts its absence (`expect(dto).not.toHaveProperty("totalAmount")`) for leads in every stage (Phase 4 test list).

---

## 5. Data layer & code organisation (new files)

```
prisma/
  schema.prisma            (§2)
  migrations/              (committed)
  seed.ts                  (CEO upsert; optional dev fixtures)
src/lib/
  env.ts                   (zod-validated env; fail-fast)
  db.ts                    (Prisma client singleton)
  schemas.ts               (ALL zod schemas + inferred DTO types — single source of truth, imported by client & server)
  auth.ts                  (OTP issue/verify, jose session, requireUser/requireRole, CSRF origin check)
  email.ts                 (sendEmail adapter: console | resend)
  emails/                  (template functions per notification)
  leads/
    token.ts               (token generation, §6)
    stateMachine.ts        (pure transition table + guards, §4)
    service.ts             (transactional mutations, DTO mappers ceoLeadDto/partnerLeadDto)
    duplicates.ts          (same-partner block, cross-partner flag)
  phone.ts                 (libphonenumber-js: parse/validate/format; `+`/`00` = any country, bare numbers default AE; store E.164)
  time.ts                  (Asia/Dubai formatting, month-boundary helpers)
  log.ts                   (structured JSON logger, PII-safe)
```

**Dependencies to add (all free/open-source, boring on purpose):** `prisma`, `@prisma/client`, `zod`, `jose`, `libphonenumber-js`, `resend`; dev: `vitest`, `tsx` (seed/scripts). Nothing else. No UI kit, no state library, no Redis/queue.

---

## 6. API contract

**Choice: Route Handlers (`src/app/api/**`), not Server Actions.** Rationale: an explicit, inspectable HTTP contract is easier to guard uniformly (`requireRole` + origin check in one wrapper), test with Vitest, exercise with curl, and reuse for CSV downloads. Server Actions would blur the partner/CEO boundary that this product's security rests on. Every handler: (1) zod-parses input (body/query/params), (2) `requireUser`/`requireRole`, (3) origin check on mutations, (4) partner-scoped queries take `partnerId` **from the session, never from the request**. Errors share one shape:

```jsonc
// error (4xx/5xx)
{ "error": { "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | INVALID_TRANSITION | DUPLICATE_LEAD | RATE_LIMITED", "message": "Human-readable, safe to show", "fields": { "clientPhone": "Enter a valid UAE phone number" } } }
// list success
{ "data": [ /* DTOs */ ], "page": 1, "pageSize": 20, "total": 137 }
// single success
{ "data": { /* DTO */ } }
```

Unknown lead ids and other partners' lead ids both return **404** (not 403) for partner callers — existence of other partners' data is not leaked. Pagination: `page`/`pageSize` (max 50), `sort` allow-list only (`createdAt:desc` default, `stageChangedAt`, `commissionAmount` where relevant) — never raw `orderBy` passthrough.

### 6.1 Auth

| Route | Guard | Request | Response |
|---|---|---|---|
| `POST /api/auth/request-otp` | public (+ origin) | `{ email }` | `200 { ok: true, message: "If this email is registered, a code has been sent." }` — always identical (§3.2) |
| `POST /api/auth/verify-otp` | public (+ origin) | `{ email, code }` | `200 { data: { user: { id, role, name } } }` + session cookie; `401` generic on any failure |
| `POST /api/auth/logout` | any session | — | `200 { ok: true }`, cookie cleared |
| `GET /api/me` | session | — | `200 { data: { id, role, name, email, phone, companyName } }`; `401` if none |

### 6.2 CEO only (`requireRole("CEO")` in every handler)

| Route | Notes |
|---|---|
| `GET /api/admin/overview` | KPI aggregates (§7): new-unattended count, won-this-month, conversion (90 d), commission payable sum; funnel counts; top partners; needs-attention list. One response, all SQL aggregates (`groupBy`/`aggregate`/`$queryRaw` for conversion) — no in-memory scans. |
| `GET /api/admin/leads?stage=&stageGroup=new\|won\|lost&serviceType=&partnerId=&q=&from=&to=&page=&pageSize=&sort=` | `q` matches token / clientName / clientPhone (normalised digits). Returns CEO list DTO (includes partner name, `isPossibleDuplicate`, unattended flag = `firstViewedAt IS NULL` or `stage=NEW` older than 48 h). |
| `GET /api/admin/leads/:id` | Full CEO detail DTO + timeline events (with actor names). Sets `firstViewedAt = now` if null (same update, no extra round trip). |
| `PATCH /api/admin/leads/:id/stage` | `{ toStage, expectedStage, totalAmount?, commissionPercent?, lostReason?, lostReasonNote? }` → state machine (§4). `totalAmount` required when `toStage=WON_ADVANCE_TAKEN`; `commissionPercent` defaults to 25 server-side when omitted. A client-sent `commissionAmount` is rejected by the schema (unknown/computed field). `200` updated CEO detail DTO (incl. computed `commissionAmount`); `409 INVALID_TRANSITION` with `allowedNext`. Notifications per §6.5. |
| `PATCH /api/admin/leads/:id` | `{ internalNote?, totalAmount?, commissionPercent? }` — commission edits recompute `commissionAmount` server-side and are rejected `409` if `PAID`; note edit appends `NOTE_UPDATED`. |
| `POST /api/admin/leads/:id/commission/pay` | `{ paidAt, paidRef? }` → only from `PAYABLE`; appends `COMMISSION_PAID`; partner email. |
| `GET /api/admin/partners?q=&includeInactive=&page=` | List DTO incl. per-partner lead/won counts (aggregated, not N+1). |
| `POST /api/admin/partners` | `{ name, email, phone, companyName }` → creates `PARTNER`; email unique (409 on clash, incl. clashing with CEO email); phone → E.164. Optional welcome email (§6.5, best-effort). Response includes the created partner DTO. |
| `GET /api/admin/partners/:id` | Partner DTO + stats + their leads (paginated). |
| `PATCH /api/admin/partners/:id` | `{ name?, email?, phone?, companyName?, isActive? }`. Email change re-checks uniqueness. `isActive:false` also bumps `sessionVersion` (instant lockout). **No DELETE endpoint exists** — partners with history cannot be hard-deleted, by construction. CEO accounts cannot be created/edited here at all (seed-only; guards reject `role` in payloads). |
| `GET /api/admin/commissions?status=payable\|paid\|expected&partnerId=&month=YYYY-MM&page=` | Ledger rows: lead token, partner, client, service, total amount, commission % , computed commission amount, status, paidAt/ref (total/% are CEO-facing here regardless of Q7a). Plus `totals` per status for the filtered set. |
| `GET /api/admin/export/leads.csv`, `GET /api/admin/export/commissions.csv` | Same filters as the corresponding list endpoints; streamed `text/csv` with `Content-Disposition`. CSV cells escaped (formula-injection safe: prefix `=`, `+`, `-`, `@` with `'`). Dubai-formatted dates. CEO-only, and logged (`export.leads` event with filter summary — these contain PII). |

### 6.3 Partner only (`requireRole("PARTNER")`; `partnerId` always from session)

| Route | Notes |
|---|---|
| `POST /api/partner/leads` | `{ clientName, clientPhone, serviceType, requirementNote? }` → creates token (§6.4), `201 { data: { id, token, stage: "NEW", createdAt } }`. Duplicate rules §6.4 → `409 DUPLICATE_LEAD` (same partner) with friendly copy. CEO email notification. |
| `GET /api/partner/leads?stage=&serviceType=&q=&page=&pageSize=` | Own leads only (`where: { partnerId: session.sub }`). Partner list DTO: token, clientName, serviceType, stage, commission `{ status, amount?, percent? }` per §4.3, createdAt. **`totalAmount` is never present in this DTO (Q7a)** — the mapper is an explicit allow-list, and a test asserts the key's absence. |
| `GET /api/partner/leads/:id` | `where: { id, partnerId: session.sub }` else 404. Partner detail DTO + partner-safe timeline (stage events + commission events; **no** `totalAmount`, internal note, lost reason, or actor-internal meta). |
| `GET /api/partner/overview` | Own KPIs (§7) + tokens-by-stage counts + recent tokens. |
| `GET /api/partner/profile` | Own profile DTO. |
| `PATCH /api/partner/profile` | **Phone only** (Q8 resolved): `{ phone }` → E.164 validated (any country, §6.4 phone rules). Name/email/company are CEO-managed and read-only here — this matches the brief's "CEO creates the account" model and prevents impersonation-by-email-change. Attempts to patch other fields are rejected by the schema. |

### 6.4 Token generation & duplicates

- Token: `"TJ-" + 6 chars` from the 32-char unambiguous alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I`), chars drawn with `crypto.randomInt` (rejection-free indexing). ~30 bits of entropy; at low-hundreds of leads/month collisions are rare, and creation retries up to 5 times on Prisma `P2002` (unique violation) before failing `500` — collision-safe by construction, and there is a unit test that forces a collision.
- Phone normalisation: `libphonenumber-js`, stored **always as E.164**. Parsing rule: if the input begins with `+` or `00`, it is parsed as an **international number for any country** (`00` is normalised to `+` first) and accepted if valid for its country; only a number with **no** country prefix falls back to the default country `AE` (e.g. `050 123 4567` → `+971501234567`). Non-UAE numbers are therefore first-class: `+91…`, `+44…`, `+7…` all validate and store as-is. Invalid → `400` with field error. Display formats (international format from the library), `wa.me/<digits>` and `tel:<E.164>` links all derive from the stored E.164 value, never re-parsed from free text. The `PhoneInput` UI mirrors this: it does not hard-prepend `+971`; it shows `+971` as the hint/placeholder for bare local numbers while accepting a leading `+`/`00` for any country, and displays the parsed international format once valid. Unit tests cover AE local, `+971`, `00971`, and non-UAE `+91`, `+44`, `+7` numbers plus invalid inputs (Phase 0 for the `phone.ts` unit itself; Phase 3 for API-level coverage).
- **Same partner + same phone + same service within 90 days → block**, `409 DUPLICATE_LEAD`: "You've already submitted this client for this service on <date> (token TJ-…). Contact TijaraOne if this is a new requirement." *(Window and service-matching as specified in the brief; Q2 confirms.)*
- **Different partner + same phone (any service, within 90 days — proposed; confirm under Q2) → allow**, but `isPossibleDuplicate=true`, `duplicateOfId` = earliest such lead, `LeadEvent(MARKED_DUPLICATE)`; CEO sees the badge and both lead links. First submission keeps attribution. The submitting partner is **not** told (telling them leaks another partner's activity).
- Both checks run inside the creation transaction against the `clientPhone` index.

### 6.5 Notification emails (awaited with timeout, never fail the operation)

All sends follow §3.5: `await`ed with a ~3–5 s timeout in `try/catch` — **no fire-and-forget, no `waitUntil`** (Netlify may terminate background work after the response). A failed/slow send is logged and the business operation still succeeds.

| Trigger | To | Content (essentials) |
|---|---|---|
| Token created | CEO (all active `CEO` users — supports Q6 multi-CEO later) | Partner name/company, client name, service, token, deep link `/admin/leads/:id`, `tel:`/`wa.me` links |
| → `WON_ADVANCE_TAKEN`, → `WON_CLOSED`, commission `PAID` | The lead's partner | Token, client name, new stage in plain words, commission amount/status where applicable, link to `/dashboard` |
| Partner created | The new partner (if CEO ticks "send welcome email", default on) | Welcome, portal URL, "you'll receive a one-time code at this email to sign in" — no credentials exist to send |
| OTP | The requesting user (if registered+active) | 6-digit code, 10-minute expiry, "ignore if this wasn't you" |

No other stage changes email the partner (per Q5 default). Emails contain no internal notes, lost reasons, or other partners' data.

---

## 7. Insights (dashboards)

Discipline enforced: **≤ 4 KPI cards + 1 chart + 1 list/table per dashboard.** Aggregates in SQL. "This month"/"last 90 days" on Asia/Dubai boundaries (§4.2).

**CEO Overview (`/admin`)**
- KPIs: ① New leads awaiting action (`stage=NEW` and (`firstViewedAt IS NULL` or older than 48 h) — highlighted when > 0; ② Won this month (`WON_CLOSED` count by `closedAt`, plus won-pipeline count); ③ Conversion rate, last 90 days = `WON_* ÷ (WON_* + LOST)` decided leads; ④ Commission payable (sum of `PAYABLE` amounts, AED).
- Chart: pipeline funnel — counts at `NEW → WON_ADVANCE_PENDING → WON_ADVANCE_TAKEN → WON_IN_PROCESS → WON_CLOSED`, `LOST` shown alongside (current-state funnel, labelled as such; it is a snapshot, not cohort conversion — copy will say so to avoid misleading the CEO).
- List: Top partners (leads / won / conversion, top 5) + "Needs attention" (stale `NEW` leads, oldest first, top 5) — one card, two tabs or two stacked lists within the single allowed list slot.
- Secondary (collapsible section below, not competing on the main view): leads by service type; leads per month (last 6 months).
- **No chart library.** Funnel/bars are Tailwind divs with widths from the API — at this data size a chart dep is unjustified weight. Revisit only if the CEO asks for trend lines.

**Partner Dashboard (`/dashboard`)**
- KPIs: ① Tokens generated (total + this month); ② Won (in-pipeline + closed); ③ Commission expected + payable (two figures in one card); ④ Commission paid (total + this month).
- Chart: tokens by stage (simple horizontal bars, same div technique).
- Table: recent tokens (10) with stage badge + commission status; row → token detail (drawer/page §8). Empty state: "Generate your first token" CTA — a first-class designed state, not an afterthought.

---

## 8. Frontend route & component map

Routing keeps the existing top-level URLs (`/`, `/dashboard`, `/admin`) and adds nested routes beneath them, so bookmarks and the middleware rules stay simple. `src/app/client/**` is deleted. Every page is a thin server component that (a) calls `requireUser`/`requireRole`, (b) fetches via the service layer (server-side, no self-HTTP hop), and passes DTOs to client components; mutations go through the typed API client to Route Handlers. A typed client (`src/lib/apiClient.ts`) wraps `fetch` with the §6 error shape and the shared zod DTO schemas — the client never redefines API types.

### 8.1 Routes

| Route | Role | Screen | Data needed | Key components |
|---|---|---|---|---|
| `/` | public | Login (email step → OTP step) | `POST request-otp`, `POST verify-otp`, then role redirect | `LoginCard`, `OtpInput` (§8.3), skyline layout kept from current `page.tsx` |
| `/dashboard` | PARTNER | Partner overview (§7) | `GET /api/partner/overview` | `KpiCard`, `StageBars`, `LeadTable`, `EmptyState` |
| `/dashboard/generate` | PARTNER | Generate Token form → success (big token + Copy) | `POST /api/partner/leads` | `GenerateTokenForm`, `PhoneInput`, `TokenSuccess` |
| `/dashboard/tokens` | PARTNER | My Tokens (search, service + stage filters, paginated; cards on mobile) | `GET /api/partner/leads` | `LeadFilters`, `LeadTable`/`LeadCard`, `StageBadge`, `Pagination` |
| `/dashboard/tokens/[id]` | PARTNER | Token detail: stage timeline, commission status | `GET /api/partner/leads/:id` | `LeadTimeline`, `CommissionBadge` (drawer on desktop from list, page on mobile/direct link — one component, two mounts) |
| `/dashboard/commissions` | PARTNER | Own expected/payable/paid + per-token breakdown | `GET /api/partner/leads` filtered by commission status (or a dedicated summary block in overview DTO — decided in Phase 5; no new endpoint invented without need) | `CommissionSummary`, `LeadTable` |
| `/dashboard/profile` | PARTNER | Profile (name/email/company read-only; phone editable per §11) | `GET/PATCH /api/partner/profile` | `ProfileForm` |
| `/admin` | CEO | CEO overview (§7) | `GET /api/admin/overview` | `KpiCard`, `PipelineFunnel`, `TopPartners`, `NeedsAttention` |
| `/admin/leads` | CEO | Leads working screen: stage chips (All/New/Won/Lost), service + partner filters, search, duplicate/unattended badges | `GET /api/admin/leads` | `LeadFilters`, `LeadTable`, `StageBadge`, `DuplicateBadge` |
| `/admin/leads/[id]` | CEO | Lead detail (also opened as drawer over `/admin/leads`): client info, Call/WhatsApp, requirement note, partner info, stage control, internal note, timeline | `GET /api/admin/leads/:id`, stage/note/pay mutations | `LeadDetailDrawer`, `StageControl`, `CommissionField`, `LostReasonField`, `InternalNoteEditor`, `LeadTimeline`, `ConfirmDialog` |
| `/admin/partners` | CEO | Partners list + search + "Add partner" | `GET/POST /api/admin/partners` | `PartnerTable`, `PartnerForm` |
| `/admin/partners/[id]` | CEO | Partner detail: stats, their leads, deactivate toggle | `GET/PATCH /api/admin/partners/:id` | `PartnerForm`, `ConfirmDialog`, `LeadTable` |
| `/admin/commissions` | CEO | Payable/paid ledger, partner + month filters, Mark-paid, CSV export | `GET /api/admin/commissions`, pay action, export endpoints | `CommissionLedger`, `MarkPaidDialog`, `ExportButtons` |
| `/403`, `/404` (framework), error boundaries | all | Friendly errors, "back to my dashboard" by role | — | `ErrorState` |

**Navigation (sidebar look kept — extracted from the current monoliths, not redesigned):**
Partner: **Dashboard · Generate Token · My Tokens · Commissions · Profile**. CEO: **Overview · Leads · Partners · Commissions**. Both shells share `AppShell` (sidebar + topbar + user menu + logout), parameterised by role and nav items. Mobile: bottom nav / collapsed sidebar per current responsive behaviour, tap targets ≥ 44 px (CEO WhatsApps from his phone — Call/WhatsApp buttons are large, sticky in the lead drawer).

### 8.2 Shared components (`src/components/**`)

```
components/ui/        Button, Input, Select, Textarea, Card, Badge, Skeleton, Toast (context),
                      ConfirmDialog, Drawer, Pagination, EmptyState, FormField (label+error+describedby)
components/leads/     StageBadge (single colour map for all 6 stages + commission statuses),
                      LeadTable, LeadCard, LeadFilters, LeadTimeline, LeadDetailDrawer,
                      StageControl (renders ONLY legal next steps from `allowedNext`; reveals
                      CommissionField on Advance Taken, LostReasonField on Lost, each with
                      confirm step for Lost / Mark-paid), CommissionBadge
components/partners/  PartnerForm, PartnerTable, InitialsAvatar (initials, no avatar URLs)
components/auth/      OtpInput, LoginCard
components/layout/    AppShell, Sidebar, TopBar, UserMenu
```

Stage badge colours (finalised in Phase 0 against brand tokens, AA-checked): `NEW` blue, `WON_ADVANCE_PENDING` amber, `WON_ADVANCE_TAKEN` violet, `WON_IN_PROCESS` sky, `WON_CLOSED` green, `LOST` rose/grey; commission: `EXPECTED` amber outline, `PAYABLE` green outline, `PAID` solid green. One map in `StageBadge` — never re-implemented per screen.

### 8.3 Key-screen specifics

- **Login:** step state inside one card (skyline art untouched). Email step: single field, submit → generic confirmation copy ("If this email is registered…"), never confirms existence. OTP step: 6-box input — autofocus, paste-to-fill, auto-advance, auto-submit on completion, backspace navigation, `inputMode="numeric"`, `autocomplete="one-time-code"`; resend button disabled with a visible 30 s countdown (server still authoritative); errors inline + shake-free, announced via `aria-live`. Copy includes: "Access is by invitation. Contact your TijaraOne manager." Demo buttons, password, remember-me, forgot-password: gone.
- **Generate Token:** client name, service (5 options — segmented on desktop / select on mobile), `PhoneInput` (bare numbers default to UAE `+971`; a leading `+` or `00` accepts any country, e.g. `+91`, stored E.164 — §6.4), optional note (char count, max 500). Inline zod errors (same schemas as server). Success state replaces the form: token in large mono type, Copy button (with copied confirmation), "Generate another" + "View my tokens". Duplicate-block error renders as a friendly inline alert, not a toast.
- **CEO lead drawer `StageControl`:** buttons only for `allowedNext` returned by the API. Choosing *Advance taken* reveals the commission inputs inline — **total amount (AED)** plus **commission % pre-filled at 25** — with a live, read-only preview of the computed commission (`total × %`, formatted AED) so the CEO sees the exact payable figure before confirming (server recomputes authoritatively on submit); choosing *Lost* reveals reason dropdown + optional note. Lost and Mark-paid require `ConfirmDialog`. Every mutation: optimistic UI is **not** used for money/stage (server is truth); buttons disable + spinner, success → toast + timeline prepends, error → inline message with the server's text.
- **Everywhere:** loading skeletons (not spinners) for tables/cards, designed empty states, toast feedback for mutations, labels/`htmlFor`/focus-visible rings on all forms, `tel:` and `https://wa.me/<e164-digits>` one-tap actions wherever a phone appears for the CEO.

---

## 9. Phased task checklist

Each phase: build → `npm run build` + tests green → **stop for Fahad's review**. No phase starts before the previous is approved.

### Phase 0 — Foundation ✅ DONE 2026-10-20 (pending Fahad review; Neon item open, see below)
- [x] Add deps (§5); `prisma init`-equivalent layout; `prisma/schema.prisma` per §2; first migration; Prisma client singleton.
- [x] Neon project + branch wired; `DATABASE_URL`/`DATABASE_URL_UNPOOLED` wired; migration runs clean against Neon. **DONE 2026-10-20:** `neon init` (org `org-holy-unit-41592065`, project `calm-pond-23217788`, branch `production`), `neon deploy` pulled `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH` into `.env.local`; `prisma migrate deploy` applied `20261020111321_init` to Neon; seed ran twice with the same CEO id (idempotent, 1 CEO row); end-to-end proof via `npm run db:check` through the app's own Prisma + `@prisma/adapter-neon` client (PostgreSQL 18.6, Users: 1). The migration/seed had additionally been validated earlier against a local Postgres 16 (Docker). **Close-out (2026-10-21):** a `dev` Neon branch (`br-cold-recipe-zampfz0n`, no expiry) was created from `production`; `.env.local` now points at **dev** for all local work, and production credentials must live only in the hosting provider's env settings from here on — dev experiments never run against production. `migrate deploy` + seed confirmed on dev. The placeholder CEO was deleted and replaced with the real CEO (from `SEED_CEO_*` env) on **both** branches; each branch contains **exactly 1 CEO row** (verified by count only). Future migrations are tested on dev first.
- [x] `.env.example` (all vars, no real values) + zod `src/lib/env.ts` fail-fast.
- [x] Seed: CEO from env (idempotent); optional non-prod dev fixtures.
- [x] `src/lib/schemas.ts` (all zod schemas/DTOs), `phone.ts`, `time.ts`, `log.ts`, token generator.
- [x] Delete `src/lib/mockData.ts`, `src/lib/types.ts`, `src/lib/translations.ts` (Q4: English-only, copy inlined), `src/app/client/**`; strip mock/translation imports and the language switcher so the app still builds with a temporary "under construction" home (login UI lands in Phase 1).
- [x] Base UI components (§8.2 `ui/` set) + `StageBadge` colour map; normalise `layout.tsx`.
- [x] Vitest wired (`npm test`), smoke test (env schema, token alphabet).
- **Acceptance (2026-10-20):** `npm run build` ✅ (routes `/`, `/admin`, `/dashboard` static, ~87 kB shared JS); `npm test` ✅ 19/19 (phone incl. `+91`/`+44`/`+7`, token, commission rounding, env, Dubai month bounds); migration + seed ✅ against local Postgres 16 and ✅ against Neon (`production` branch, `migrate deploy` applied, seed idempotent, `db:check` end-to-end OK); `rg localStorage|mockData|translations` in `src/` ✅ no matches; `.env.example` documents every var; no linter errors.

### Phase 1 — Auth ✅ DONE 2026-10-21 (pending Fahad review; Resend live-delivery item open, see Acceptance)
- [x] `sendEmail` adapter (console driver logs OTP in dev); OTP issue/verify (§3.2–3.3) with HMAC, expiry, single-use, 5-attempt lockout, DB rate limits (3/email/15 min, 10/IP/hour, 30 s cooldown).
- [x] `jose` session cookie, `requireUser`/`requireRole`, origin check, `/api/me`, logout; deactivation lockout via `isActive` + `sessionVersion`.
- [x] `middleware.ts` role gating + post-login redirects.
- [x] New login UI (§8.3) on the kept skyline/card design; role-based landing.
- [x] Tests: OTP lifecycle (issue→verify, expiry, lockout, single-use, invalidation on re-issue), rate limits, generic-response indistinguishability, session rejection for inactive/version-bumped users, role guard matrix.
- **Acceptance (2026-10-21):** `npm run build` ✅ (incl. Middleware 31.6 kB); `npm test` ✅ **37/37** (14 auth integration tests run against the **dev branch only**, hard-guarded by `NEON_BRANCH=dev`; 3 email-timeout; 20 foundation). Manual walkthrough on the dev server ✅: login page carries the invitation copy; missing `Origin` → 403; unknown vs registered email responses byte-identical; OTP read from the **dev console log only**, wrong code → 401, correct code → 200 + `tj_session` cookie; `/api/me` returns the partner; partner `/admin` → 307 `/dashboard`; CEO login → `/dashboard` 307 `/admin`, `/admin` 200; logout → `/api/me` 401; no `localStorage` anywhere (`rg` clean). **Bug found & fixed during walkthrough:** Next's webpack bundling broke `ws`'s native path inside the Neon adapter (`bufferUtil.mask is not a function`, all DB calls 500'd) — fixed with `serverComponentsExternalPackages` in `next.config.mjs` + `bufferutil`/`utf-8-validate`. **OPEN (per Fahad's acceptance addition):** real Resend delivery to Gmail/Outlook (inbox vs spam) is **not yet tested — the sending domain is not verified and no `RESEND_API_KEY` is configured**; the Resend driver is implemented behind the adapter and awaits with a 4 s timeout. To be tested as soon as DNS is live. Prisma packages pinned exact (`6.19.3`, no `^`).

### Phase 2 — Partner management (CEO) ✅ (2026-10-22)
- [x] Partner CRUD endpoints (§6.2) with uniqueness, E.164 phones, no-delete guarantee, welcome email (adapter; Resend driver still stubbed by env if domain not yet verified — flagged, not blocking).
- [x] CEO Partners screens (§8.1): list/search, add-partner form, detail with stats + leads, deactivate toggle with confirm.
- [x] Tests: guard matrix (partner → 403/404 on all admin partner routes), duplicate-email 409, deactivation bumps `sessionVersion`.
- **Acceptance:** CEO can create a partner who can then OTP-login (with Phase 1); duplicate email rejected with field error; deactivated partner is locked out immediately and cannot log in again; partners list shows accurate lead/won counts; no delete affordance exists anywhere.
- **Built:** `src/lib/partners/service.ts` (role-guarded `listPartners`/`createPartner`/`getPartner`/`updatePartner`; **no delete function exists**; strict schemas reject `role`/CEO edits structurally), `src/lib/emails/welcomeEmail.ts`, `/api/admin/partners` (+`/[id]`), `AppShell` (dark sidebar; Leads/Commissions nav marked "Soon"), `/admin/partners` (search, include-inactive, pagination), `/admin/partners/[id]` (stats, their tokens, edit form, deactivate-with-confirm). Partners are onboarded on their **private email** (Gmail/Outlook etc.) per Fahad; note: OTP deliverability to those inboxes still depends on the Resend domain verification (Phase 6 / Fahad action).
- **Acceptance evidence (2026-10-22):** `npm test` ✅ **53/53** (7 partner integration tests on the dev branch incl. a Gmail-style private address normalised at the service layer, duplicate-409 incl. CEO email, 403 matrix, session-revocation via deactivation, search/stats, `deletePartner` export asserted undefined); live HTTP checks on the dev server ✅ (201 create → 409 field error → deactivate → hidden by default, shown with `includeInactive` → 401 anonymous; welcome email rendered via console driver); production-mode sign-off ✅ (`npm run build` + `npm start`, CEO login via `scripts/smoke-otp.ts`-seeded code — production logs contain **zero** code prints — `/api/me` 200, `/api/admin/partners` 200, `/admin/partners` 200). Phase 1 fixes landed in the same session (timing pad §3.5, `CLIENT_IP_HEADER` trust, `db:seed:dev`).

### Phase 3 — Token generation (partner)
- [ ] `POST /api/partner/leads` + token generator (collision retry), duplicate rules (§6.4), CEO notification email; partner list/detail endpoints + DTO mapper (no internal fields).
- [ ] Generate Token UI (form + success/copy state), My Tokens list (filters/search/pagination, mobile cards), token detail with partner timeline.
- [ ] Tests: token format/alphabet, forced-collision retry, same-partner duplicate blocked, cross-partner duplicate allowed + flagged, partner cannot read another's lead (404), phone normalisation cases (AE bare/`+971`/`00971`, non-UAE `+91`/`+44`/`+7` accepted and stored E.164, invalid numbers rejected).
- **Acceptance:** partner generates `TJ-XXXXXX`, copies it; it appears in their list instantly; same phone+service re-submit is blocked with the friendly message; a second partner submitting the same phone succeeds but is flagged CEO-side only; tampering with the lead id in the URL returns 404.

### Phase 4 — Lead pipeline (CEO)
- [ ] State machine module (§4) + stage PATCH, lead PATCH (note/commission), mark-paid endpoints; event log writes in-transaction; `firstViewedAt` on detail; CEO Leads screen + detail drawer (`StageControl`, Call/WhatsApp, timeline); partner notification emails (Advance Taken / Closed / Paid).
- [ ] Tests (the core suite): **every** legal transition succeeds with correct side effects; **every** illegal transition 409s (exhaustive from×to matrix); total amount required at Advance Taken with percent defaulting to 25 when omitted, percent bounds (`0 < % ≤ 100`) enforced, computed commission equals `ROUND(total × % / 100, 2)` incl. rounding edge cases (e.g. 9,999.99 @ 25% → 2,500.00), client-supplied `commissionAmount` rejected, editing total/percent before PAID recomputes atomically and locked after PAID; Lost requires reason and clears total/percent/amount with audit event; undo-close blocked after PAID; mark-paid exactly once; optimistic-concurrency 409; partner DTO never contains `internalNote`/`lostReason` at any stage, and never contains `totalAmount` (`not.toHaveProperty("totalAmount")`, Q7a) while always exposing `commissionPercent` once set.
- **Acceptance:** full walk NEW → … → WON_CLOSED → PAID with timeline matching §4.1 event-for-event; Lost from a commissioned stage visibly resets commission (CEO view) and logs it; reopen works and is logged; two-tab stale update is rejected, not overwritten; partner sees Expected→Payable→Paid labels change and receives the three emails (console driver acceptable until Resend is live).

### Phase 5 — Dashboards & insights
- [ ] CEO overview + partner overview endpoints (SQL aggregates, Dubai month boundaries); both dashboards per §7 (≤4 KPIs + 1 chart + 1 list); commissions screens (CEO ledger + Mark-paid entry point, partner breakdown); CSV exports with injection-safe escaping.
- [ ] Tests: aggregate correctness on fixture data (conversion denominator, payable sums, month boundaries around midnight Dubai time); CSV escaping; export guard (partner → 403).
- **Acceptance:** KPI numbers reconcile by hand against seeded fixture leads; funnel and stage bars match DB counts; payable ledger total equals overview KPI; CSVs open cleanly in Excel/Sheets with correct AED amounts and Dubai dates; dashboards respect the 4+1+1 rule (verified visually, mobile + desktop).

### Phase 6 — Hardening & launch
- [ ] Security headers (via `next.config`): CSP (sized to actual assets), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/frame-ancestors, HSTS (prod). Error pages (404/403/global error boundary), no stack/PII leakage.
- [ ] Rate-limit & abuse re-check against §3 numbers; OTP table pruning script; structured-log review (grep logs for accidental PII in dev runs).
- [ ] Resend production wiring: domain SPF/DKIM/DMARC verification, `EMAIL_FROM`, production OTP deliverability test to CEO + one partner.
- [ ] Hosting executed (Q11): deploy to **Netlify Free** (after verifying its current free-plan terms permit this commercial use) and re-run the full auth smoke test there. No Vercel-only APIs may exist in the codebase by this point (no `waitUntil`, no Vercel-specific env assumptions). **Standing rule (Fahad, 2026-10-21):** deploy + re-run the auth smoke test on the chosen host, with the **plain-Prisma + pooled-URL fallback** (drop `@prisma/adapter-neon`, all DB access stays behind `src/lib/db.ts`) if the Neon adapter fails on that host. No Netlify/hosting spike before Phase 6.
- [ ] `public/images` reference audit → delete unreferenced assets; verify `sharp` usage; final dead-code sweep (`rg localStorage`, `rg mockData` return nothing).
- [ ] `README.md`: local setup (Node, Neon, env table, migrate/seed, dev OTP console flow), Resend + DNS steps, deploy steps, env-var reference, backup/export routine (§10), deactivation & commission-correction procedures, free-tier limits table.
- [ ] Full regression: `npm test`, `npm run build`, manual role-matrix pass (CEO/partner/inactive/anonymous × every route).
- **Acceptance:** all tests + build green; security headers verified on the deployed URL; OTP email arrives in production; README lets a new developer go from clone → running locally with a seeded CEO in < 30 min; no secrets in repo (`git log -p | rg` spot-check); Phase-6 checklist signed off before the domain points at it.

---

## 10. Risks & non-functional notes

**Free-tier limits that could bite (zero-cost constraint):**

| Service | Free limit (verify at launch — tiers change) | How we'd notice / mitigation |
|---|---|---|
| Neon (Postgres) | ~0.5 GB storage, limited compute-hours; autosuspend on idle | Neon dashboard alerts; DB is tiny at this scale (leads are rows, not blobs). Autosuspend adds a cold-start second or two — acceptable. OTP rows pruned (Phase 6). |
| Resend | ~100 emails/day, ~3,000/month; requires verified domain | OTP + notifications at 10–50 users won't approach this unless OTP abuse occurs — the DB rate limits are the real protection. Bounce/send failures logged via adapter. |
| Hosting — **Netlify Free** (Q11) | Free-plan terms and limits (build minutes, bandwidth, function duration) change; commercial-use eligibility must be **verified against the current terms before Phase 6**. Vercel Hobby is not used for production (its terms restrict it to non-commercial use). | Code stays host-agnostic from Phase 0: no Vercel-only APIs (no `waitUntil` — see §3.5), no host-specific env assumptions. If Netlify's terms/limits don't fit at Phase 6, the fallback evaluation is Cloudflare (would need a runtime/Prisma compatibility spike) — the decision is revisited then with current terms, not assumed today. Netlify function timeouts are also why email sends are awaited with a 3–5 s cap rather than left unbounded (§3.5). |
| Domain/DNS | Already owned | SPF/DKIM/DMARC records for Resend are a launch blocker for email deliverability — needs whoever controls DNS, scheduled in Phase 6 (start the conversation in Phase 1). |

**Other risks:**
- **Email deliverability is the product's single point of failure** (OTP = login). Mitigations: verified domain from day one, console-driver fallback documented for emergencies, CEO can verify a partner's identity by phone and (worst case) a developer can mint a session manually — procedure documented in README, never a backdoor endpoint.
- **JWT logout limitation:** logout clears the cookie client-side; a copied cookie lives until expiry/`sessionVersion` bump. Accepted at this scale; documented in §3.4.
- **Commission data has no correction UI after PAID** (Q10, deliberate — money audit integrity). Corrections are a documented, developer-run data fix with a `LeadEvent` appended manually; the procedure lives in the README (Phase 6).
- **Funnel semantics:** the §7 funnel is a current-state snapshot, not a cohort conversion funnel. Copy must say "Leads by stage" to avoid the CEO over-reading conversion. (Low risk, but misleading dashboards erode trust.)
- **Phone-number identity:** duplicate rules key on exact E.164 phone. The same client on two numbers (or a number recycled by a carrier) defeats it. Accepted for v1; the CEO's `q` search by name is the manual backstop.
- **Time zones:** all "month"/"48 h" logic hinges on the single Dubai-boundary helper. It has dedicated tests (Phase 5) because off-by-one-month commission totals are exactly the bug this product cannot ship.
- **Scale ceiling:** everything here is deliberately sized for ≤ 50 users / low-hundreds of leads a month. The first things to revisit beyond that: OTP email volume, in-DB rate limiting under real concurrency, and offset pagination. None justify more infrastructure now.
- **Data safety/backup (free tier):** Neon free includes point-in-time restore on a short window (verify current retention). Belt-and-braces: README documents a monthly manual ritual — CEO exports `leads.csv` + `commissions.csv` (built in Phase 5) and/or `pg_dump` via connection string, stored in the business's Drive. Partners are never hard-deleted; `LeadEvent` is append-only; OTP data self-prunes.
- **Observability:** structured logs (§3.6) via stdout → host log viewer is sufficient. No Sentry/Logtail (cost/complexity). Auth-failure and stage-change log lines are the audit trail supplementing `LeadEvent`.
- **Security posture summary:** server-side role checks in every handler (middleware is not the boundary), partner queries always session-scoped, 404-not-403 for cross-partner ids, hashed OTPs, timing-safe compare, indexed DB rate limits, origin checks, zod everywhere, CSV-injection escaping, no PII in logs, secrets env-only. No secrets exist in the repo today and none will be committed (`.env.example` carries names only).

---

## 11. Decisions log (approved by Fahad, 2026-10-20)

All questions are resolved as follows. **Q12 is the only open item** and must be filled in by Fahad.

| # | Decision |
|---|---|
| Q1 | **No.** CEO does not create leads. The "Onboard client" modal is deleted. |
| Q2 | **Yes**, as specified in §6.4: first submission wins attribution, later cross-partner submissions are allowed but flagged to the CEO only, 90-day window; same-partner + same-phone + same-service within 90 days is blocked. |
| Q3 | **No.** Tokens are read-only after submission; corrections happen via the CEO. |
| Q4 | **English-only for v1.** `src/lib/translations.ts` is deleted and the language switcher is removed everywhere; copy is inlined English (§1, §8). |
| Q5 | **Yes**, as in §6.5: partner emails only on Advance Taken, Closed, and Paid. |
| Q6 | **One CEO account at launch**; schema and notification code stay multi-CEO-capable. |
| Q7 | **Percentage-based:** `commissionAmount = totalAmount × commissionPercent / 100`, `commissionPercent` defaults to **25%**, pre-filled and editable per lead by the CEO until `PAID`. `totalAmount` is the **full service fee charged to the client** (not just the advance); UI label **"Total service fee (AED)"**. |
| Q7a | Partner sees the computed **AED commission and the percentage**. Partner does **not** see `totalAmount` in any DTO, even though it can be derived; it is excluded by the DTO mapper and covered by a test (§4.3, §6.3). |
| Q8 | Partner can edit **phone only**; name/email/company are CEO-managed. |
| Q9 | When `lostReason = OTHER`, the note is **optional**. |
| Q10 | After `PAID`, corrections are a **documented developer-run data fix** with a manually appended `LeadEvent`. No self-serve UI. |
| Q11 | **Target Netlify Free** for production; verify current free-plan terms for commercial use before Phase 6. Code stays host-agnostic; no Vercel-only APIs (hence the awaited-email rule in §3.5/§6.5). |
| Q12 | **[FAHAD TO FILL IN: who controls DNS, Neon and hosting, and when DNS access is available.]** Blocks Resend domain verification and therefore production email, not code phases 0–5. |

---

## Appendix A — What approval means

This plan was approved on 2026-10-20 and authorises **Phase 0 only**. Each subsequent phase begins after the previous phase's acceptance criteria are demonstrated and approved. Any change to money handling (§4), auth (§3), or data visibility (§6) discovered mid-build stops the phase and comes back as a plan amendment — it is not absorbed silently into the code.

## Appendix B — Traceability (brief → plan)

Brief §2 permissions → §3.4/§6 guards + per-phase guard-matrix tests · §3 core flow → §6.3–6.5, §8 · §4 pipeline → §4 (state machine) · §5 stack/schema → §2, §5 · §6 auth → §3 · §7 API/notifications/duplicates → §6 · §8 insights → §7 · §9 frontend → §1, §8 · §10 phases → §9 · §11 non-functional → §10 · §12 questions → §11 (decisions log).
